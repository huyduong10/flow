const mongoose = require('mongoose');
const MaterialRequest = require('../material-requests/material-request.model');
const PurchaseRequest = require('../procurement/purchase-request.model');
const { MATERIAL_REQUEST_STATUS, PURCHASE_REQUEST_STATUS, ROLES } = require('../../utils/constants');

/**
 * GET /api/warehouse/pending-requests
 * Lấy danh sách các đơn yêu cầu cấp vật tư đang chờ kho kiểm tra (PENDING_WAREHOUSE)
 * Role: WAREHOUSE_MANAGER, CEO, CHAIRMAN
 */
const getPendingRequests = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = {
      status: MATERIAL_REQUEST_STATUS.PENDING_WAREHOUSE,
    };

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { requestCode: searchRegex },
        { project: searchRegex },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      MaterialRequest.find(filter)
        .populate('requestedBy', 'fullName email phone role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MaterialRequest.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)) || 1,
      },
    });
  } catch (error) {
    console.error('getPendingRequests error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách đơn chờ kho xử lý.',
      error: error.message,
    });
  }
};

/**
 * GET /api/warehouse/requests/:id
 * Lấy chi tiết đơn yêu cầu cấp vật tư để kho kiểm tra tồn kho
 * Role: WAREHOUSE_MANAGER, SITE_MANAGER, CEO, CHAIRMAN
 */
const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Mã ID đơn vật tư không hợp lệ.',
      });
    }

    const materialRequest = await MaterialRequest.findById(id)
      .populate('requestedBy', 'fullName email phone role')
      .populate('warehouseInspectorId', 'fullName email phone role')
      .populate('procurementRequestId', 'code status items createdAt approvedAt');

    if (!materialRequest) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn yêu cầu cấp vật tư.',
      });
    }

    return res.json({
      success: true,
      data: materialRequest,
    });
  } catch (error) {
    console.error('getRequestById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy chi tiết đơn vật tư.',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/warehouse/requests/:id/check
 * Quản lý kho kiểm tra tồn kho, nhập số lượng thực cấp & Tự động tách đơn
 * Role: WAREHOUSE_MANAGER
 * Body: { items: [{ itemId, stockSuppliedQty }], notes: string }
 */
const checkAndProcessStock = async (req, res) => {
  const { id } = req.params;
  const { items: suppliedItems, notes } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Mã ID đơn vật tư không hợp lệ.',
    });
  }

  if (!Array.isArray(suppliedItems) || suppliedItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Danh sách vật tư kiểm tra không được để trống.',
    });
  }

  // Khởi tạo Mongoose Session cho Transaction đảm bảo tính toàn vẹn dữ liệu
  const session = await mongoose.startSession();

  try {
    let resultData = null;

    // Bọc trong session transaction
    await session.withTransaction(async () => {
      // 1. Tìm đơn yêu cầu cấp vật tư trong session
      const materialRequest = await MaterialRequest.findById(id).session(session);

      if (!materialRequest) {
        throw new Error('NOT_FOUND: Không tìm thấy đơn yêu cầu cấp vật tư.');
      }

      if (materialRequest.status !== MATERIAL_REQUEST_STATUS.PENDING_WAREHOUSE) {
        throw new Error(`INVALID_STATE: Đơn này đang ở trạng thái "${materialRequest.status}", không thể xử lý lại.`);
      }

      // Map itemId -> stockSuppliedQty để tra cứu nhanh
      const suppliedMap = new Map();
      for (const item of suppliedItems) {
        if (!item.itemId) {
          throw new Error('VALIDATION: Mỗi dòng vật tư phải có itemId.');
        }
        const qty = Number(item.stockSuppliedQty);
        if (isNaN(qty) || qty < 0) {
          throw new Error('VALIDATION: Số lượng xuất kho không được nhỏ hơn 0.');
        }
        suppliedMap.set(item.itemId.toString(), qty);
      }

      let totalRequested = 0;
      let totalStockSupplied = 0;
      let totalPurchaseNeeded = 0;
      const shortageItemsForProcurement = [];

      // 2. Duyệt qua từng item và validate
      for (const item of materialRequest.items) {
        const itemIdStr = item._id.toString();

        if (!suppliedMap.has(itemIdStr)) {
          throw new Error(`VALIDATION: Thiếu thông tin số lượng xuất kho cho vật tư: ${item.materialName}`);
        }

        const stockSuppliedQty = suppliedMap.get(itemIdStr);

        // Validate: stockSuppliedQty không được âm và không được lớn hơn requestedQty
        if (stockSuppliedQty < 0) {
          throw new Error(`VALIDATION: Số lượng xuất kho của "${item.materialName}" không được âm.`);
        }
        if (stockSuppliedQty > item.requestedQty) {
          throw new Error(
            `VALIDATION: Số lượng xuất kho của "${item.materialName}" (${stockSuppliedQty}) không được lớn hơn số lượng yêu cầu (${item.requestedQty}).`
          );
        }

        // Tính purchaseQty = requestedQty - stockSuppliedQty
        const purchaseQty = Math.round((item.requestedQty - stockSuppliedQty) * 1000) / 1000;

        item.stockSuppliedQty = stockSuppliedQty;
        item.purchaseQty = purchaseQty;

        totalRequested += item.requestedQty;
        totalStockSupplied += stockSuppliedQty;
        totalPurchaseNeeded += purchaseQty;

        // Nếu món này còn thiếu, gom vào danh sách mua ngoài
        if (purchaseQty > 0) {
          shortageItemsForProcurement.push({
            name: item.materialName,
            unit: item.unit,
            quantity: purchaseQty,
            note: `Tự động tách từ yêu cầu ${materialRequest.requestCode} (Yêu cầu: ${item.requestedQty}, Kho cấp: ${stockSuppliedQty})`,
          });
        }
      }

      // Lưu thông tin người kiểm tra kho & ghi chú
      materialRequest.warehouseInspectorId = req.user._id;
      materialRequest.warehouseNotes = notes ? notes.trim() : '';

      const now = new Date();
      let createdPurchaseRequest = null;

      // ─────────────────────────────────────────────────────────────
      // LOGIC XỬ LÝ NGHIỆP VỤ & TÁCH ĐƠN (Theo 3 kịch bản):
      // ─────────────────────────────────────────────────────────────

      // KỊCH BẢN 1: ĐỦ 100% TỪ KHO
      // Tất cả items có purchaseQty === 0
      if (totalPurchaseNeeded === 0) {
        materialRequest.status = MATERIAL_REQUEST_STATUS.WAITING_SITE_CONFIRMATION;
        materialRequest.deliveredAt = now;
        materialRequest.procurementRequestId = null;
      }
      // KỊCH BẢN 2 & 3: HẾT SẠCH HOẶC CẤP MỘT PHẦN
      // Có ít nhất 1 item có purchaseQty > 0
      else {
        // Tạo mới 1 bản ghi PurchaseRequest với danh sách items chỉ gồm các món thiếu
        const [newPR] = await PurchaseRequest.create(
          [
            {
              projectName: materialRequest.project,
              items: shortageItemsForProcurement,
              note: `Đơn mua sắm tự động tách từ Yêu cầu vật tư ${materialRequest.requestCode} do kho không đủ số lượng cấp. Ghi chú thủ kho: ${notes || 'Không có'}`,
              status: PURCHASE_REQUEST_STATUS.PENDING_CEO_APPROVAL,
              createdBy: materialRequest.requestedBy,
              materialRequestId: materialRequest._id,
            },
          ],
          { session }
        );

        createdPurchaseRequest = newPR;
        materialRequest.procurementRequestId = newPR._id;

        // Kịch bản 2: Có cấp được 1 phần hàng (stockSuppliedQty > 0)
        // Trạng thái là WAITING_SITE_CONFIRMATION để công trường nhận phần sẵn có trước
        if (totalStockSupplied > 0) {
          materialRequest.status = MATERIAL_REQUEST_STATUS.WAITING_SITE_CONFIRMATION;
          materialRequest.deliveredAt = now;
        }
        // Kịch bản 3: Kho hoàn toàn không có gì (stockSuppliedQty === 0 toàn bộ)
        // Trạng thái thành FORWARDED_TO_CEO
        else {
          materialRequest.status = MATERIAL_REQUEST_STATUS.FORWARDED_TO_CEO;
        }
      }

      // Lưu thay đổi trên MaterialRequest trong transaction
      await materialRequest.save({ session });

      resultData = {
        materialRequest,
        purchaseRequest: createdPurchaseRequest,
        totalRequested,
        totalStockSupplied,
        totalPurchaseNeeded,
        shortageCount: shortageItemsForProcurement.length,
      };
    });

    session.endSession();

    // Populate dữ liệu trả về cho client
    const populatedRequest = await MaterialRequest.findById(id)
      .populate('requestedBy', 'fullName email phone role')
      .populate('warehouseInspectorId', 'fullName email phone role')
      .populate('procurementRequestId', 'code status items createdAt');

    let responseMessage = '';
    if (resultData.totalPurchaseNeeded === 0) {
      responseMessage = 'Kiểm tra hoàn tất: Kho đáp ứng 100% vật tư. Đã chuyển công trường xác nhận nhận hàng.';
    } else if (resultData.totalStockSupplied > 0) {
      responseMessage = `Đã xuất kho phần sẵn có (${resultData.totalStockSupplied}) và tự động tạo đơn mua ngoài cho ${resultData.shortageCount} vật tư thiếu chuyển CEO duyệt.`;
    } else {
      responseMessage = `Kho hoàn toàn hết hàng. Đã tự động tạo đơn mua ngoài cho toàn bộ ${resultData.shortageCount} vật tư và chuyển thẳng CEO duyệt.`;
    }

    return res.json({
      success: true,
      message: responseMessage,
      data: {
        materialRequest: populatedRequest,
        purchaseRequest: resultData.purchaseRequest,
      },
    });
  } catch (error) {
    session.endSession();
    console.error('checkAndProcessStock error:', error);

    const errorMessage = error.message || '';
    if (errorMessage.startsWith('VALIDATION:')) {
      return res.status(400).json({
        success: false,
        message: errorMessage.replace('VALIDATION:', '').trim(),
      });
    }
    if (errorMessage.startsWith('NOT_FOUND:')) {
      return res.status(404).json({
        success: false,
        message: errorMessage.replace('NOT_FOUND:', '').trim(),
      });
    }
    if (errorMessage.startsWith('INVALID_STATE:')) {
      return res.status(400).json({
        success: false,
        message: errorMessage.replace('INVALID_STATE:', '').trim(),
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xử lý kiểm kho và tách đơn.',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/warehouse/requests/:id/site-confirm
 * Trưởng thi công (SITE_MANAGER) xác nhận đã nhận hàng từ kho
 * Role: SITE_MANAGER (của chính đơn đó)
 */
const confirmSiteReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Mã ID đơn vật tư không hợp lệ.',
      });
    }

    const materialRequest = await MaterialRequest.findById(id);

    if (!materialRequest) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn yêu cầu cấp vật tư.',
      });
    }

    // Kiểm tra quyền: Chỉ SITE_MANAGER của chính đơn đó mới được gọi
    if (materialRequest.requestedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Trưởng thi công lập đơn này mới có quyền xác nhận nhận hàng.',
      });
    }

    // Kiểm tra trạng thái đơn
    if (materialRequest.status !== MATERIAL_REQUEST_STATUS.WAITING_SITE_CONFIRMATION) {
      return res.status(400).json({
        success: false,
        message: `Đơn này không ở trạng thái chờ công trường nhận (trạng thái hiện tại: ${materialRequest.status}).`,
      });
    }

    // Cập nhật thời điểm xác nhận
    materialRequest.siteConfirmedAt = new Date();

    // Nếu không có phần mua ngoài (!procurementRequestId), hoàn tất đơn cấp kho 100%
    if (!materialRequest.procurementRequestId) {
      materialRequest.status = MATERIAL_REQUEST_STATUS.FULFILLED_BY_STOCK;
    }

    await materialRequest.save();

    // Populate dữ liệu trả về
    await materialRequest.populate([
      { path: 'requestedBy', select: 'fullName email phone role' },
      { path: 'warehouseInspectorId', select: 'fullName email phone role' },
      { path: 'procurementRequestId', select: 'code status items createdAt' },
    ]);

    return res.json({
      success: true,
      message: materialRequest.procurementRequestId
        ? 'Đã xác nhận nhận đủ phần hàng kho cấp. Phần hàng thiếu đang được CEO xem xét mua sắm.'
        : 'Đã xác nhận nhận đủ 100% vật tư từ kho. Đơn yêu cầu hoàn tất thành công.',
      data: materialRequest,
    });
  } catch (error) {
    console.error('confirmSiteReceipt error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xác nhận nhận hàng.',
      error: error.message,
    });
  }
};

/**
 * GET /api/warehouse/history
 * Lấy lịch sử tất cả các đơn đã hoặc đang được xử lý ở kho
 */
const getWarehouseHistory = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && Object.values(MATERIAL_REQUEST_STATUS).includes(status)) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      MaterialRequest.find(filter)
        .populate('requestedBy', 'fullName email phone role')
        .populate('warehouseInspectorId', 'fullName email phone role')
        .populate('procurementRequestId', 'code status')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MaterialRequest.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)) || 1,
      },
    });
  } catch (error) {
    console.error('getWarehouseHistory error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy lịch sử kho.',
      error: error.message,
    });
  }
};

module.exports = {
  getPendingRequests,
  getRequestById,
  checkAndProcessStock,
  confirmSiteReceipt,
  getWarehouseHistory,
};
