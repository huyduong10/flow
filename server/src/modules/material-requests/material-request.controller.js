const mongoose = require('mongoose');
const MaterialRequest = require('./material-request.model');
const { MATERIAL_REQUEST_STATUS, ROLES } = require('../../utils/constants');

/**
 * POST /api/material-requests
 * Trưởng thi công (SITE_MANAGER) gửi yêu cầu cấp vật tư
 */
const createMaterialRequest = async (req, res) => {
  try {
    const { project, items } = req.body;

    if (!project || !project.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên dự án/công trình là bắt buộc.',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cần ít nhất 1 vật tư trong danh sách yêu cầu.',
      });
    }

    const validatedItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.materialName || !item.materialName.trim()) {
        return res.status(400).json({
          success: false,
          message: `Dòng ${i + 1}: Tên vật tư là bắt buộc.`,
        });
      }
      if (!item.unit || !item.unit.trim()) {
        return res.status(400).json({
          success: false,
          message: `Dòng ${i + 1}: Đơn vị tính là bắt buộc.`,
        });
      }
      const qty = Number(item.requestedQty);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({
          success: false,
          message: `Dòng ${i + 1}: Số lượng yêu cầu phải lớn hơn 0.`,
        });
      }

      validatedItems.push({
        materialName: item.materialName.trim(),
        unit: item.unit.trim(),
        requestedQty: qty,
        stockSuppliedQty: 0,
        purchaseQty: 0,
      });
    }

    const materialRequest = await MaterialRequest.create({
      project: project.trim(),
      items: validatedItems,
      requestedBy: req.user._id,
      status: MATERIAL_REQUEST_STATUS.PENDING_WAREHOUSE,
    });

    await materialRequest.populate('requestedBy', 'fullName email phone role');

    return res.status(201).json({
      success: true,
      message: 'Gửi yêu cầu cấp vật tư tới Quản lý kho thành công.',
      data: materialRequest,
    });
  } catch (error) {
    console.error('createMaterialRequest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo yêu cầu cấp vật tư.',
      error: error.message,
    });
  }
};

/**
 * GET /api/material-requests
 * Lấy danh sách yêu cầu vật tư:
 * - SITE_MANAGER: xem các đơn do mình tạo
 * - WAREHOUSE_MANAGER, CEO, CHAIRMAN: xem tất cả
 */
const getMaterialRequests = async (req, res) => {
  try {
    const { status, project, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === ROLES.SITE_MANAGER) {
      filter.requestedBy = req.user._id;
    }

    if (status && Object.values(MATERIAL_REQUEST_STATUS).includes(status)) {
      filter.status = status;
    }

    if (project && project.trim()) {
      filter.project = new RegExp(project.trim(), 'i');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      MaterialRequest.find(filter)
        .populate('requestedBy', 'fullName email phone role')
        .populate('warehouseInspectorId', 'fullName email phone role')
        .populate('procurementRequestId', 'code status')
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
    console.error('getMaterialRequests error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách yêu cầu vật tư.',
      error: error.message,
    });
  }
};

/**
 * GET /api/material-requests/:id
 * Lấy chi tiết đơn yêu cầu cấp vật tư
 */
const getMaterialRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Mã ID không hợp lệ.',
      });
    }

    const materialRequest = await MaterialRequest.findById(id)
      .populate('requestedBy', 'fullName email phone role')
      .populate('warehouseInspectorId', 'fullName email phone role')
      .populate('procurementRequestId', 'code status items createdAt approvedAt');

    if (!materialRequest) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu vật tư.',
      });
    }

    // SITE_MANAGER chỉ được xem đơn của mình
    if (
      req.user.role === ROLES.SITE_MANAGER &&
      materialRequest.requestedBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem đơn của Trưởng thi công khác.',
      });
    }

    return res.json({
      success: true,
      data: materialRequest,
    });
  } catch (error) {
    console.error('getMaterialRequestById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết yêu cầu vật tư.',
      error: error.message,
    });
  }
};

module.exports = {
  createMaterialRequest,
  getMaterialRequests,
  getMaterialRequestById,
};
