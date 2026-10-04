const mongoose = require('mongoose');
const { PROJECT_STATUS } = require('../../utils/constants');

const projectSchema = new mongoose.Schema(
  {
    // Mã dự án duy nhất (VD: DA-CT01)
    code: {
      type: String,
      required: [true, 'Mã dự án là bắt buộc'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    // Tên dự án
    name: {
      type: String,
      required: [true, 'Tên dự án là bắt buộc'],
      trim: true,
    },
    // Ngân sách được phân bổ ban đầu (VNĐ)
    allocatedBudget: {
      type: Number,
      default: 0,
      min: [0, 'Ngân sách phân bổ không thể âm'],
    },
    // Trạng thái dự án
    status: {
      type: String,
      enum: {
        values: Object.values(PROJECT_STATUS),
        message: 'Trạng thái dự án {VALUE} không hợp lệ',
      },
      default: PROJECT_STATUS.ACTIVE,
    },
    // Trưởng thi công phụ trách (nếu có)
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Mô tả / Địa điểm công trình
    description: {
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

projectSchema.index({ status: 1 });
projectSchema.index({ managerId: 1 });

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
