const mongoose = require('mongoose');
const { MATERIAL_REQUEST_STATUS } = require('../../utils/constants');

/**
 * Subdocument Schema cho từng dòng vật tư trong Yêu cầu cấp vật tư
 */
const materialItemSchema = new mongoose.Schema(
  {
    materialName: {
      type: String,
      required: [true, 'Tên vật tư là bắt buộc'],
      trim: true,
    },
    unit: {
      type: String,
      required: [true, 'Đơn vị tính là bắt buộc'],
      trim: true,
    },
    requestedQty: {
      type: Number,
      required: [true, 'Số lượng yêu cầu là bắt buộc'],
      min: [0.001, 'Số lượng yêu cầu phải lớn hơn 0'],
    },
    stockSuppliedQty: {
      type: Number,
      default: 0,
      min: [0, 'Số lượng xuất kho không thể âm'],
    },
    purchaseQty: {
      type: Number,
      default: 0,
      min: [0, 'Số lượng mua ngoài không thể âm'],
    },
  },
  { _id: true }
);

const materialRequestSchema = new mongoose.Schema(
  {
    // Mã yêu cầu duy nhất: MR-YYYY-XXXX (VD: MR-2026-0001)
    requestCode: {
      type: String,
      unique: true,
      trim: true,
    },
    // Dự án / Công trình thi công
    project: {
      type: String,
      required: [true, 'Tên dự án là bắt buộc'],
      trim: true,
    },
    // Người yêu cầu (Trưởng thi công - SITE_MANAGER)
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Người yêu cầu là bắt buộc'],
    },
    // Trạng thái phiếu
    status: {
      type: String,
      enum: {
        values: Object.values(MATERIAL_REQUEST_STATUS),
        message: 'Trạng thái {VALUE} không hợp lệ',
      },
      default: MATERIAL_REQUEST_STATUS.PENDING_WAREHOUSE,
    },
    // Danh sách vật tư yêu cầu
    items: {
      type: [materialItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Cần ít nhất 1 vật tư trong danh sách yêu cầu',
      },
    },
    // Quản lý kho thực hiện kiểm tra (WAREHOUSE_MANAGER)
    warehouseInspectorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Ghi chú của thủ kho khi kiểm tra
    warehouseNotes: {
      type: String,
      trim: true,
      default: '',
    },
    // Thời điểm kho bàn giao / xuất kho
    deliveredAt: {
      type: Date,
      default: null,
    },
    // Thời điểm công trường (SITE_MANAGER) xác nhận đã nhận hàng
    siteConfirmedAt: {
      type: Date,
      default: null,
    },
    // Phiếu mua sắm tách ra nếu kho thiếu hàng (nullable)
    procurementRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseRequest',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes tối ưu truy vấn
materialRequestSchema.index({ status: 1 });
materialRequestSchema.index({ requestedBy: 1 });
materialRequestSchema.index({ createdAt: -1 });

// Tự động sinh mã phiếu MR-YYYY-XXXX trước khi lưu
materialRequestSchema.pre('save', async function (next) {
  if (this.isNew && !this.requestCode) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('MaterialRequest').countDocuments({
      requestCode: { $regex: `^MR-${year}-` },
    });
    this.requestCode = `MR-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const MaterialRequest = mongoose.model('MaterialRequest', materialRequestSchema);

module.exports = MaterialRequest;
