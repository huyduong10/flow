const Contract = require('../models/Contract');
const VendorQuote = require('../models/VendorQuote');
const {
  ROLES,
  VENDOR_COMPARISON_STATUS,
  CONTRACT_STATUS,
} = require('../utils/constants');

/**
 * POST /api/contracts
 * Thu mua upload file hợp đồng đã ký
 * Role: PROCUREMENT
 * Body (multipart/form-data): vendorQuoteId, totalValue, note, files[]
 */
const createContract = async (req, res) => {
  try {
    const { vendorQuoteId, totalValue, note } = req.body;

    // ── Validate đầu vào ────────────────────────────────────
    if (!vendorQuoteId) {
      return res.status(400).json({
        success: false,
        message: 'Mã bảng so sánh NCC (vendorQuoteId) là bắt buộc.',
      });
    }

    if (!totalValue || parseFloat(totalValue) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị hợp đồng phải lớn hơn 0.',
      });
    }

    // Kiểm tra có file upload không
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng upload ít nhất 1 file hợp đồng (PDF/ảnh).',
      });
    }

    // ── Kiểm tra VendorQuote ────────────────────────────────
    const vendorQuote = await VendorQuote.findById(vendorQuoteId).populate('purchaseRequest');
    if (!vendorQuote) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng so sánh NCC.',
      });
    }

    if (vendorQuote.status !== VENDOR_COMPARISON_STATUS.VENDOR_APPROVED) {
      return res.status(400).json({
        success: false,
        message: `NCC chưa được phê duyệt. Trạng thái hiện tại: "${vendorQuote.status}".`,
      });
    }

    // Xác định projectId từ request body hoặc từ purchaseRequest
    const projectId = req.body.projectId || vendorQuote.purchaseRequest?.projectId;
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy thông tin dự án liên kết.',
      });
    }

    // Kiểm tra đã có hợp đồng cho VendorQuote này chưa
    const existingContract = await Contract.findOne({ vendorQuote: vendorQuoteId });
    if (existingContract) {
      return res.status(400).json({
        success: false,
        message: 'Đã có hợp đồng cho bảng so sánh NCC này. Không thể tạo trùng.',
      });
    }

    // Lấy tên NCC được recommend
    const recommendedVendor = vendorQuote.vendors.find((v) => v.isRecommended);
    if (!recommendedVendor) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy NCC được đề xuất trong bảng so sánh.',
      });
    }

    // ── Map file upload ─────────────────────────────────────
    const files = req.files.map((f) => ({
      originalName: f.originalname,
      fileName: f.filename,
      filePath: f.path,
      fileSize: f.size,
      mimeType: f.mimetype,
    }));

    // ── Tạo Contract ────────────────────────────────────────
    const contract = await Contract.create({
      vendorQuote: vendorQuoteId,
      projectId,
      purchaseRequest: vendorQuote.purchaseRequest?._id || vendorQuote.purchaseRequest,
      vendorName: recommendedVendor.vendorName,
      totalValue: parseFloat(totalValue),
      files,
      status: CONTRACT_STATUS.UPLOADED,
      createdBy: req.user._id,
      note: note?.trim() || '',
    });

    await contract.populate('createdBy', 'fullName email role');
    await contract.populate('projectId', 'code name allocatedBudget status');
    await contract.populate('purchaseRequest', 'code projectName');

    res.status(201).json({
      success: true,
      message: 'Tạo hợp đồng và upload file thành công.',
      data: contract,
    });
  } catch (error) {
    console.error('createContract error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('; '),
      });
    }
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo hợp đồng.',
    });
  }
};

/**
 * GET /api/contracts
 * Lấy danh sách hợp đồng
 */
const getContracts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && Object.values(CONTRACT_STATUS).includes(status)) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [contracts, total] = await Promise.all([
      Contract.find(filter)
        .populate('createdBy', 'fullName email role')
        .populate('projectId', 'code name allocatedBudget status')
        .populate('purchaseRequest', 'code projectName')
        .populate('handedOverBy', 'fullName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Contract.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: contracts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('getContracts error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống.',
    });
  }
};

/**
 * GET /api/contracts/:id
 * Xem chi tiết hợp đồng
 */
const getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('createdBy', 'fullName email role')
      .populate('projectId', 'code name allocatedBudget status')
      .populate('purchaseRequest', 'code projectName items')
      .populate('vendorQuote')
      .populate('handedOverBy', 'fullName email role');

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng.',
      });
    }

    res.json({
      success: true,
      data: contract,
    });
  } catch (error) {
    console.error('getContractById error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống.',
    });
  }
};

/**
 * PATCH /api/contracts/:id/handover
 * Thu mua chuyển giao hợp đồng cho Kế toán
 * Role: PROCUREMENT
 */
const handoverToAccountant = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng.',
      });
    }

    if (contract.status !== CONTRACT_STATUS.UPLOADED) {
      return res.status(400).json({
        success: false,
        message: `Không thể chuyển giao. Trạng thái hiện tại: "${contract.status}". Cần ở trạng thái "UPLOADED".`,
      });
    }

    if (contract.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Hợp đồng chưa có file đính kèm. Vui lòng upload trước.',
      });
    }

    contract.status = CONTRACT_STATUS.HANDED_TO_ACCOUNTANT;
    contract.handedOverAt = new Date();
    contract.handedOverBy = req.user._id;

    await contract.save();
    await contract.populate('createdBy', 'fullName email role');
    await contract.populate('handedOverBy', 'fullName email role');
    await contract.populate('purchaseRequest', 'code projectName');

    res.json({
      success: true,
      message: 'Đã chuyển giao hợp đồng cho Kế toán thành công.',
      data: contract,
    });
  } catch (error) {
    console.error('handoverToAccountant error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi chuyển giao hợp đồng.',
    });
  }
};

module.exports = {
  createContract,
  getContracts,
  getContractById,
  handoverToAccountant,
};
