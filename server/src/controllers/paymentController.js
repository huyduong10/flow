const PaymentProposal = require('../models/PaymentProposal');
const Contract = require('../models/Contract');
const {
  ROLES,
  CONTRACT_STATUS,
  PAYMENT_PROPOSAL_STATUS,
  DISBURSEMENT_STATUS,
  PAYMENT_TYPE,
  CHAIRMAN_APPROVAL_THRESHOLD,
} = require('../utils/constants');

/**
 * POST /api/payments
 * Kế toán tạo đề xuất thanh toán
 * Role: ACCOUNTANT
 */
const createPaymentProposal = async (req, res) => {
  try {
    const {
      contractId,
      paymentType,
      proposedAmount,
      milestones,
      bankAccount,
      note,
    } = req.body;

    // ── Validate đầu vào cơ bản ─────────────────────────────
    if (!contractId) {
      return res.status(400).json({
        success: false,
        message: 'Mã hợp đồng (contractId) là bắt buộc.',
      });
    }

    if (!paymentType || !Object.values(PAYMENT_TYPE).includes(paymentType)) {
      return res.status(400).json({
        success: false,
        message: `Loại thanh toán phải là "${PAYMENT_TYPE.ONE_TIME}" hoặc "${PAYMENT_TYPE.MILESTONE}".`,
      });
    }

    if (!proposedAmount || proposedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền đề xuất phải lớn hơn 0.',
      });
    }

    // ── Validate thông tin ngân hàng ────────────────────────
    if (!bankAccount) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin tài khoản thụ hưởng (bankAccount) là bắt buộc.',
      });
    }

    if (!bankAccount.accountNumber || !bankAccount.accountNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Số tài khoản thụ hưởng là bắt buộc.',
      });
    }

    if (!bankAccount.accountName || !bankAccount.accountName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên chủ tài khoản là bắt buộc.',
      });
    }

    if (!bankAccount.bankName || !bankAccount.bankName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên ngân hàng là bắt buộc.',
      });
    }

    // ── Validate milestones nếu thanh toán theo đợt ─────────
    if (paymentType === PAYMENT_TYPE.MILESTONE) {
      if (!Array.isArray(milestones) || milestones.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Thanh toán theo đợt phải có ít nhất 1 milestone.',
        });
      }

      let milestoneTotal = 0;
      for (let i = 0; i < milestones.length; i++) {
        const ms = milestones[i];
        if (!ms.label || !ms.label.trim()) {
          return res.status(400).json({
            success: false,
            message: `Đợt ${i + 1}: Tên đợt thanh toán là bắt buộc.`,
          });
        }
        if (!ms.amount || ms.amount <= 0) {
          return res.status(400).json({
            success: false,
            message: `Đợt ${i + 1}: Số tiền phải lớn hơn 0.`,
          });
        }
        milestoneTotal += ms.amount;
      }

      // Tổng các đợt phải bằng proposedAmount
      if (Math.abs(milestoneTotal - proposedAmount) > 1) {
        return res.status(400).json({
          success: false,
          message: `Tổng các đợt (${milestoneTotal.toLocaleString('vi-VN')} VNĐ) không khớp với số tiền đề xuất (${proposedAmount.toLocaleString('vi-VN')} VNĐ).`,
        });
      }
    }

    // ── Kiểm tra Contract ───────────────────────────────────
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng.',
      });
    }

    if (contract.status !== CONTRACT_STATUS.HANDED_TO_ACCOUNTANT) {
      return res.status(400).json({
        success: false,
        message: `Hợp đồng chưa được chuyển giao cho Kế toán. Trạng thái: "${contract.status}".`,
      });
    }

    // ── Kiểm tra số dư hợp đồng ────────────────────────────
    // Tổng các đề xuất đã tạo (không bị REJECTED) cho hợp đồng này
    const existingProposals = await PaymentProposal.find({
      contract: contractId,
      status: { $ne: PAYMENT_PROPOSAL_STATUS.REJECTED },
    });

    const totalAllocated = existingProposals.reduce(
      (sum, p) => sum + p.proposedAmount,
      0
    );

    const remaining = contract.totalValue - totalAllocated;

    if (proposedAmount > remaining) {
      return res.status(400).json({
        success: false,
        message: `Số tiền đề xuất (${proposedAmount.toLocaleString('vi-VN')} VNĐ) vượt quá số dư hợp đồng. Giá trị HĐ: ${contract.totalValue.toLocaleString('vi-VN')} VNĐ, đã phân bổ: ${totalAllocated.toLocaleString('vi-VN')} VNĐ, còn lại: ${remaining.toLocaleString('vi-VN')} VNĐ.`,
      });
    }

    // ── Xác định projectId ─────────────────────────────────
    const projectId = req.body.projectId || contract.projectId;
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy dự án liên kết với hợp đồng.',
      });
    }

    // ── Tạo PaymentProposal ─────────────────────────────────
    const proposal = await PaymentProposal.create({
      projectId,
      contract: contractId,
      paymentType,
      proposedAmount,
      milestones: paymentType === PAYMENT_TYPE.MILESTONE ? milestones : [],
      bankAccount: {
        accountNumber: bankAccount.accountNumber.trim(),
        accountName: bankAccount.accountName.trim(),
        bankName: bankAccount.bankName.trim(),
        branch: bankAccount.branch?.trim() || '',
      },
      status: PAYMENT_PROPOSAL_STATUS.PENDING_CEO_APPROVAL,
      createdBy: req.user._id,
    });

    await proposal.populate('createdBy', 'fullName email role');
    await proposal.populate('contract', 'code vendorName totalValue');
    await proposal.populate('projectId', 'code name allocatedBudget status');

    res.status(201).json({
      success: true,
      message: 'Tạo đề xuất thanh toán thành công. Chờ CEO duyệt.',
      data: proposal,
    });
  } catch (error) {
    console.error('createPaymentProposal error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('; '),
      });
    }
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo đề xuất thanh toán.',
    });
  }
};

/**
 * GET /api/payments
 * Lấy danh sách đề xuất thanh toán
 */
const getPaymentProposals = async (req, res) => {
  try {
    const { status, projectId, contractId, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && Object.values(PAYMENT_PROPOSAL_STATUS).includes(status)) {
      filter.status = status;
    }

    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      filter.projectId = projectId;
    }

    if (contractId && mongoose.Types.ObjectId.isValid(contractId)) {
      filter.contract = contractId;
    }

    // Thủ quỹ chỉ thấy những đề xuất APPROVED_READY_TO_PAY hoặc đã PAID
    if (req.user.role === ROLES.TREASURER && !status) {
      filter.$or = [
        { status: PAYMENT_PROPOSAL_STATUS.APPROVED_READY_TO_PAY },
        { status: PAYMENT_PROPOSAL_STATUS.PAID },
        { 'disbursement.status': DISBURSEMENT_STATUS.PAID },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [proposals, total] = await Promise.all([
      PaymentProposal.find(filter)
        .populate('createdBy', 'fullName email role')
        .populate('contract', 'code vendorName totalValue')
        .populate('projectId', 'code name allocatedBudget status')
        .populate('ceoApprovedBy', 'fullName email role')
        .populate('chairmanApprovedBy', 'fullName email role')
        .populate('disbursement.paidBy', 'fullName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PaymentProposal.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: proposals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('getPaymentProposals error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống.',
    });
  }
};

/**
 * GET /api/payments/:id
 * Xem chi tiết đề xuất thanh toán
 */
const getPaymentProposalById = async (req, res) => {
  try {
    const proposal = await PaymentProposal.findById(req.params.id)
      .populate('createdBy', 'fullName email role')
      .populate('contract', 'code vendorName totalValue files')
      .populate('ceoApprovedBy', 'fullName email role')
      .populate('chairmanApprovedBy', 'fullName email role')
      .populate('rejectedBy', 'fullName email role')
      .populate('disbursement.paidBy', 'fullName email role');

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đề xuất thanh toán.',
      });
    }

    res.json({
      success: true,
      data: proposal,
    });
  } catch (error) {
    console.error('getPaymentProposalById error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống.',
    });
  }
};

/**
 * PATCH /api/payments/:id/approve
 * CEO / CHAIRMAN phê duyệt hoặc từ chối đề xuất thanh toán
 * Role: CEO | CHAIRMAN
 * Body: { action: 'approve' | 'reject', rejectionReason?: string }
 *
 * Logic nghiệp vụ:
 *   - amount < 50,000,000: CEO duyệt -> APPROVED_READY_TO_PAY
 *   - amount >= 50,000,000:
 *       CEO duyệt sơ bộ -> WAITING_CHAIRMAN_APPROVAL
 *       CHAIRMAN duyệt -> APPROVED_READY_TO_PAY
 *   - Bất kỳ ai reject -> REJECTED (bắt buộc rejectionReason)
 */
const approvePaymentProposal = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body;
    const userRole = req.user.role;

    // ── Validate action ─────────────────────────────────────
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Hành động phải là "approve" hoặc "reject".',
      });
    }

    if (action === 'reject' && (!rejectionReason || !rejectionReason.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Lý do từ chối là bắt buộc khi từ chối đề xuất.',
      });
    }

    // ── Tìm đề xuất ────────────────────────────────────────
    const proposal = await PaymentProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đề xuất thanh toán.',
      });
    }

    // ── Từ chối (CEO hoặc CHAIRMAN đều được) ────────────────
    if (action === 'reject') {
      // Kiểm tra trạng thái cho phép reject
      const rejectableStatuses = [
        PAYMENT_PROPOSAL_STATUS.PENDING_CEO_APPROVAL,
        PAYMENT_PROPOSAL_STATUS.WAITING_CHAIRMAN_APPROVAL,
      ];
      if (!rejectableStatuses.includes(proposal.status)) {
        return res.status(400).json({
          success: false,
          message: `Không thể từ chối. Trạng thái hiện tại: "${proposal.status}".`,
        });
      }

      // CEO chỉ reject được khi đang PENDING_CEO_APPROVAL
      if (
        userRole === ROLES.CEO &&
        proposal.status !== PAYMENT_PROPOSAL_STATUS.PENDING_CEO_APPROVAL
      ) {
        return res.status(400).json({
          success: false,
          message: 'CEO chỉ có thể từ chối khi đề xuất đang chờ CEO duyệt.',
        });
      }

      // CHAIRMAN chỉ reject được khi đang WAITING_CHAIRMAN_APPROVAL
      if (
        userRole === ROLES.CHAIRMAN &&
        proposal.status !== PAYMENT_PROPOSAL_STATUS.WAITING_CHAIRMAN_APPROVAL
      ) {
        return res.status(400).json({
          success: false,
          message: 'Chủ tịch chỉ có thể từ chối khi đề xuất đang chờ Chủ tịch duyệt.',
        });
      }

      proposal.status = PAYMENT_PROPOSAL_STATUS.REJECTED;
      proposal.rejectionReason = rejectionReason.trim();
      proposal.rejectedBy = req.user._id;

      await proposal.save();
      await proposal.populate('rejectedBy', 'fullName email role');
      await proposal.populate('contract', 'code vendorName totalValue');

      return res.json({
        success: true,
        message: 'Đã từ chối đề xuất thanh toán.',
        data: proposal,
      });
    }

    // ── Duyệt ───────────────────────────────────────────────
    const amount = proposal.proposedAmount;
    const needsChairman = amount >= CHAIRMAN_APPROVAL_THRESHOLD;

    if (userRole === ROLES.CEO) {
      // CEO chỉ duyệt được khi đang PENDING_CEO_APPROVAL
      if (proposal.status !== PAYMENT_PROPOSAL_STATUS.PENDING_CEO_APPROVAL) {
        return res.status(400).json({
          success: false,
          message: `CEO không thể duyệt. Trạng thái hiện tại: "${proposal.status}". Cần ở trạng thái "PENDING_CEO_APPROVAL".`,
        });
      }

      proposal.ceoApprovedBy = req.user._id;
      proposal.ceoApprovedAt = new Date();

      if (needsChairman) {
        // >= 50 triệu: CEO duyệt sơ bộ, chờ Chairman
        proposal.status = PAYMENT_PROPOSAL_STATUS.WAITING_CHAIRMAN_APPROVAL;
      } else {
        // < 50 triệu: CEO duyệt xong -> sẵn sàng chi
        proposal.status = PAYMENT_PROPOSAL_STATUS.APPROVED_READY_TO_PAY;
      }
    } else if (userRole === ROLES.CHAIRMAN) {
      // CHAIRMAN chỉ duyệt được khi đang WAITING_CHAIRMAN_APPROVAL
      if (proposal.status !== PAYMENT_PROPOSAL_STATUS.WAITING_CHAIRMAN_APPROVAL) {
        return res.status(400).json({
          success: false,
          message: `Chủ tịch không thể duyệt. Trạng thái hiện tại: "${proposal.status}". Cần ở trạng thái "WAITING_CHAIRMAN_APPROVAL".`,
        });
      }

      proposal.chairmanApprovedBy = req.user._id;
      proposal.chairmanApprovedAt = new Date();
      proposal.status = PAYMENT_PROPOSAL_STATUS.APPROVED_READY_TO_PAY;
    }

    await proposal.save();
    await proposal.populate('ceoApprovedBy', 'fullName email role');
    await proposal.populate('chairmanApprovedBy', 'fullName email role');
    await proposal.populate('contract', 'code vendorName totalValue');

    const messages = {
      [PAYMENT_PROPOSAL_STATUS.WAITING_CHAIRMAN_APPROVAL]: `CEO đã duyệt sơ bộ. Số tiền ${amount.toLocaleString('vi-VN')} VNĐ (>= 50 triệu) cần Chủ tịch phê duyệt bước cuối.`,
      [PAYMENT_PROPOSAL_STATUS.APPROVED_READY_TO_PAY]: 'Đề xuất đã được phê duyệt hoàn tất. Sẵn sàng chi tiền.',
    };

    res.json({
      success: true,
      message: messages[proposal.status],
      data: proposal,
    });
  } catch (error) {
    console.error('approvePaymentProposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xử lý phê duyệt thanh toán.',
    });
  }
};

/**
 * PATCH /api/payments/:id/disburse
 * Thủ quỹ xác nhận chi tiền
 * Role: TREASURER
 * Body: { transactionCode, note? }
 */
const disbursePayment = async (req, res) => {
  try {
    const { transactionCode, note } = req.body;

    // ── Validate ────────────────────────────────────────────
    if (!transactionCode || !transactionCode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mã giao dịch / ủy nhiệm chi là bắt buộc.',
      });
    }

    // ── Tìm đề xuất ────────────────────────────────────────
    const proposal = await PaymentProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đề xuất thanh toán.',
      });
    }

    // ── Kiểm tra trạng thái ─────────────────────────────────
    if (proposal.status !== PAYMENT_PROPOSAL_STATUS.APPROVED_READY_TO_PAY) {
      return res.status(400).json({
        success: false,
        message: `Không thể chi tiền. Trạng thái hiện tại: "${proposal.status}". Cần ở trạng thái "APPROVED_READY_TO_PAY".`,
      });
    }

    // Kiểm tra chưa chi tiền trước đó
    if (proposal.disbursement && proposal.disbursement.status === DISBURSEMENT_STATUS.PAID) {
      return res.status(400).json({
        success: false,
        message: 'Đề xuất này đã được chi tiền trước đó.',
      });
    }

    // ── Cập nhật disbursement & status PAID ─────────────────
    proposal.status = PAYMENT_PROPOSAL_STATUS.PAID;
    proposal.disbursement = {
      status: DISBURSEMENT_STATUS.PAID,
      transactionCode: transactionCode.trim(),
      note: note?.trim() || '',
      paidBy: req.user._id,
      paidAt: new Date(),
    };

    await proposal.save();
    await proposal.populate('createdBy', 'fullName email role');
    await proposal.populate('contract', 'code vendorName totalValue');
    await proposal.populate('ceoApprovedBy', 'fullName email role');
    await proposal.populate('chairmanApprovedBy', 'fullName email role');
    await proposal.populate('disbursement.paidBy', 'fullName email role');

    res.json({
      success: true,
      message: `Chi tiền thành công. Mã giao dịch: ${transactionCode.trim()}.`,
      data: proposal,
    });
  } catch (error) {
    console.error('disbursePayment error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xác nhận chi tiền.',
    });
  }
};

module.exports = {
  createPaymentProposal,
  getPaymentProposals,
  getPaymentProposalById,
  approvePaymentProposal,
  disbursePayment,
};
