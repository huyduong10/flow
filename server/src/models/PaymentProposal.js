const mongoose = require('mongoose');
const {
  PAYMENT_PROPOSAL_STATUS,
  DISBURSEMENT_STATUS,
  PAYMENT_TYPE,
} = require('../utils/constants');

// Schema cho từng đợt thanh toán (milestone)
const milestoneSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, 'Tên đợt thanh toán là bắt buộc'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Số tiền đợt là bắt buộc'],
      min: [0, 'Số tiền không được âm'],
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const paymentProposalSchema = new mongoose.Schema(
  {
    // Mã đề xuất tự sinh
    code: {
      type: String,
      unique: true,
    },
    // Dự án / Công trình liên kết
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Dự án liên kết là bắt buộc'],
    },
    // Liên kết Contract
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
      required: [true, 'Hợp đồng liên kết là bắt buộc'],
    },
    // Loại thanh toán: 1 lần hoặc theo đợt
    paymentType: {
      type: String,
      enum: Object.values(PAYMENT_TYPE),
      required: [true, 'Loại thanh toán là bắt buộc'],
    },
    // Tổng số tiền đề xuất thanh toán
    proposedAmount: {
      type: Number,
      required: [true, 'Số tiền đề xuất là bắt buộc'],
      min: [1, 'Số tiền phải lớn hơn 0'],
    },
    // Các đợt thanh toán (nếu paymentType = MILESTONE)
    milestones: {
      type: [milestoneSchema],
      default: [],
    },
    // Thông tin tài khoản thụ hưởng
    bankAccount: {
      accountNumber: {
        type: String,
        required: [true, 'Số tài khoản thụ hưởng là bắt buộc'],
        trim: true,
      },
      accountName: {
        type: String,
        required: [true, 'Tên chủ tài khoản là bắt buộc'],
        trim: true,
      },
      bankName: {
        type: String,
        required: [true, 'Tên ngân hàng là bắt buộc'],
        trim: true,
      },
      branch: {
        type: String,
        trim: true,
        default: '',
      },
    },
    // Trạng thái duyệt
    status: {
      type: String,
      enum: Object.values(PAYMENT_PROPOSAL_STATUS),
      default: PAYMENT_PROPOSAL_STATUS.DRAFT,
    },
    // Người tạo (Kế toán)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // CEO duyệt
    ceoApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ceoApprovedAt: {
      type: Date,
      default: null,
    },
    // Chairman duyệt (nếu >= 50 triệu)
    chairmanApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    chairmanApprovedAt: {
      type: Date,
      default: null,
    },
    // Lý do từ chối
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // ========== DISBURSEMENT (Chi quỹ) ==========
    disbursement: {
      status: {
        type: String,
        enum: Object.values(DISBURSEMENT_STATUS),
        default: null,
      },
      // Mã giao dịch / ủy nhiệm chi
      transactionCode: {
        type: String,
        trim: true,
        default: '',
      },
      // Ghi chú chi tiền
      note: {
        type: String,
        trim: true,
        default: '',
      },
      // Thủ quỹ xác nhận
      paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      paidAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index
paymentProposalSchema.index({ projectId: 1 });
paymentProposalSchema.index({ contract: 1 });
paymentProposalSchema.index({ status: 1 });
paymentProposalSchema.index({ createdBy: 1 });
paymentProposalSchema.index({ code: 1 }, { unique: true });
paymentProposalSchema.index({ 'disbursement.status': 1 });

// Tự sinh mã PP-YYYYMMDD-XXXX
paymentProposalSchema.pre('save', async function (next) {
  if (this.isNew && !this.code) {
    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');

    const count = await mongoose.model('PaymentProposal').countDocuments({
      code: { $regex: `^PP-${dateStr}` },
    });

    this.code = `PP-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Virtual: kiểm tra cần Chairman duyệt không
paymentProposalSchema.virtual('requiresChairmanApproval').get(function () {
  return this.proposedAmount >= 50_000_000;
});

module.exports = mongoose.model('PaymentProposal', paymentProposalSchema);
