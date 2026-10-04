const mongoose = require('mongoose');
const { CONTRACT_STATUS } = require('../utils/constants');

const contractSchema = new mongoose.Schema(
  {
    // Mã hợp đồng tự sinh
    code: {
      type: String,
      unique: true,
    },
    // Liên kết VendorQuote (đã duyệt)
    vendorQuote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorQuote',
      required: [true, 'Bảng so sánh NCC liên kết là bắt buộc'],
    },
    // Dự án / Công trình liên kết
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Dự án liên kết là bắt buộc'],
    },
    // Liên kết PurchaseRequest gốc
    purchaseRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseRequest',
      required: [true, 'Yêu cầu mua sắm liên kết là bắt buộc'],
    },
    // Tên NCC đã chọn (denormalized để tiện hiển thị)
    vendorName: {
      type: String,
      required: [true, 'Tên nhà cung cấp là bắt buộc'],
      trim: true,
    },
    // Giá trị tổng hợp đồng
    totalValue: {
      type: Number,
      required: [true, 'Giá trị hợp đồng là bắt buộc'],
      min: [0, 'Giá trị hợp đồng không được âm'],
    },
    // File hợp đồng đã ký (PDF / Image)
    files: [
      {
        originalName: { type: String, required: true },
        fileName: { type: String, required: true },
        filePath: { type: String, required: true },
        fileSize: { type: Number },
        mimeType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // Trạng thái
    status: {
      type: String,
      enum: Object.values(CONTRACT_STATUS),
      default: CONTRACT_STATUS.DRAFT,
    },
    // Người tạo (Thu mua)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Ngày chuyển giao cho Kế toán
    handedOverAt: {
      type: Date,
      default: null,
    },
    handedOverBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Ghi chú
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index
contractSchema.index({ projectId: 1 });
contractSchema.index({ vendorQuote: 1 });
contractSchema.index({ purchaseRequest: 1 });
contractSchema.index({ status: 1 });

// Tự sinh mã CT-YYYYMMDD-XXXX
contractSchema.pre('save', async function (next) {
  if (this.isNew && !this.code) {
    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');

    const count = await mongoose.model('Contract').countDocuments({
      code: { $regex: `^CT-${dateStr}` },
    });

    this.code = `CT-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Contract', contractSchema);
