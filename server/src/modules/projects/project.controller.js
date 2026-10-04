const mongoose = require('mongoose');
const Project = require('./project.model');
const PaymentProposal = require('../../models/PaymentProposal');
require('../../models/User');
const {
  PROJECT_STATUS,
  PAYMENT_PROPOSAL_STATUS,
  DISBURSEMENT_STATUS,
  ROLES,
} = require('../../utils/constants');

/**
 * GET /api/projects
 * Lấy danh sách dự án (phục vụ dropdown và quản trị)
 */
const getProjects = async (req, res) => {
  try {
    const { status, search, assignedOnly } = req.query;
    const filter = {};

    // Mặc định lấy các dự án ACTIVE trừ khi chỉ định cụ thể hoặc 'ALL'
    if (status && status !== 'ALL') {
      filter.status = status;
    } else if (!status) {
      filter.status = PROJECT_STATUS.ACTIVE;
    }

    if (search && search.trim()) {
      filter.$or = [
        { code: new RegExp(search.trim(), 'i') },
        { name: new RegExp(search.trim(), 'i') },
      ];
    }

    // Nếu người dùng là Site Manager và yêu cầu assignedOnly, lấy các dự án được phân công HOẶC dự án mở (chưa gắn managerId)
    if (req.user && req.user.role === ROLES.SITE_MANAGER && assignedOnly === 'true') {
      filter.$or = [
        { managerId: req.user._id },
        { managerId: null },
        { managerId: { $exists: false } },
      ];
    }

    const projects = await Project.find(filter)
      .populate('managerId', 'fullName email phone role')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error('getProjects error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách dự án.',
      error: error.message,
    });
  }
};

/**
 * GET /api/projects/:id
 * Lấy thông tin chi tiết một dự án
 */
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Mã dự án không hợp lệ.',
      });
    }

    const project = await Project.findById(id).populate(
      'managerId',
      'fullName email phone role'
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án.',
      });
    }

    return res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('getProjectById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy chi tiết dự án.',
      error: error.message,
    });
  }
};

/**
 * POST /api/projects
 * Tạo dự án mới (Chỉ CEO, CHAIRMAN có thẩm quyền)
 */
const createProject = async (req, res) => {
  try {
    if (req.user.role !== ROLES.CEO && req.user.role !== ROLES.CHAIRMAN) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Ban Giám Đốc (CEO hoặc Chủ tịch) mới có quyền tạo dự án và phê duyệt ngân sách.',
      });
    }

    const { code, name, allocatedBudget, description, managerId, status } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mã dự án là bắt buộc.',
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên dự án là bắt buộc.',
      });
    }

    const existingCode = await Project.findOne({ code: code.trim().toUpperCase() });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: `Mã dự án "${code.trim().toUpperCase()}" đã tồn tại.`,
      });
    }

    const project = await Project.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      allocatedBudget: Number(allocatedBudget) || 0,
      description: description || '',
      managerId: managerId || null,
      status: status || PROJECT_STATUS.ACTIVE,
    });

    await project.populate('managerId', 'fullName email phone role');

    return res.status(201).json({
      success: true,
      message: 'Tạo dự án thành công.',
      data: project,
    });
  } catch (error) {
    console.error('createProject error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo dự án.',
      error: error.message,
    });
  }
};

/**
 * GET /api/projects/expense-summary?projectId=...
 * Thống kê chi phí theo Dự án:
 * - Dùng MongoDB Aggregation pipeline gom nhóm từ collection PaymentProposal.
 * - Tính toán:
 *   * actualSpent: Tổng tiền các phiếu status === 'PAID' (hoặc disbursement.status === 'PAID')
 *   * pendingSpent: Tổng tiền các phiếu đang duyệt hoặc chờ chi
 *   * remainingBudget: allocatedBudget - actualSpent
 *   * burnRate: Tỷ lệ % ngân sách đã giải ngân
 */
const getProjectExpenseSummary = async (req, res) => {
  try {
    const { projectId } = req.query;

    let projectDoc = null;
    let allocatedBudget = 0;
    const matchStage = {};

    if (projectId && projectId !== 'ALL') {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Mã dự án (projectId) không hợp lệ.',
        });
      }

      projectDoc = await Project.findById(projectId).populate(
        'managerId',
        'fullName email phone role'
      );

      if (!projectDoc) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy dự án yêu cầu.',
        });
      }

      allocatedBudget = projectDoc.allocatedBudget || 0;
      matchStage.projectId = new mongoose.Types.ObjectId(projectId);
    } else {
      // Tính tổng ngân sách của tất cả các dự án đang ACTIVE
      const budgetAgg = await Project.aggregate([
        { $match: { status: PROJECT_STATUS.ACTIVE } },
        { $group: { _id: null, totalBudget: { $sum: '$allocatedBudget' } } },
      ]);
      allocatedBudget = budgetAgg[0]?.totalBudget || 0;
    }

    // Aggregation pipeline trên PaymentProposal
    const [stats] = await PaymentProposal.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          actualSpent: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$status', PAYMENT_PROPOSAL_STATUS.PAID] },
                    { $eq: ['$disbursement.status', DISBURSEMENT_STATUS.PAID] },
                  ],
                },
                '$proposedAmount',
                0,
              ],
            },
          },
          pendingSpent: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $in: [
                        '$status',
                        [
                          PAYMENT_PROPOSAL_STATUS.PENDING_CEO_APPROVAL,
                          PAYMENT_PROPOSAL_STATUS.PENDING_CHAIRMAN,
                          PAYMENT_PROPOSAL_STATUS.APPROVED_READY_TO_PAY,
                        ],
                      ],
                    },
                    { $ne: ['$disbursement.status', DISBURSEMENT_STATUS.PAID] },
                    { $ne: ['$status', PAYMENT_PROPOSAL_STATUS.PAID] },
                  ],
                },
                '$proposedAmount',
                0,
              ],
            },
          },
          paidCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$status', PAYMENT_PROPOSAL_STATUS.PAID] },
                    { $eq: ['$disbursement.status', DISBURSEMENT_STATUS.PAID] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          pendingCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $in: [
                        '$status',
                        [
                          PAYMENT_PROPOSAL_STATUS.PENDING_CEO_APPROVAL,
                          PAYMENT_PROPOSAL_STATUS.PENDING_CHAIRMAN,
                          PAYMENT_PROPOSAL_STATUS.APPROVED_READY_TO_PAY,
                        ],
                      ],
                    },
                    { $ne: ['$disbursement.status', DISBURSEMENT_STATUS.PAID] },
                    { $ne: ['$status', PAYMENT_PROPOSAL_STATUS.PAID] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalProposals: { $sum: 1 },
        },
      },
    ]) || [{}];

    const actualSpent = stats?.actualSpent || 0;
    const pendingSpent = stats?.pendingSpent || 0;
    const remainingBudget = allocatedBudget - actualSpent;
    const burnRate =
      allocatedBudget > 0
        ? Number(((actualSpent / allocatedBudget) * 100).toFixed(2))
        : 0;

    return res.json({
      success: true,
      data: {
        project: projectDoc
          ? {
              _id: projectDoc._id,
              code: projectDoc.code,
              name: projectDoc.name,
              allocatedBudget: projectDoc.allocatedBudget,
              status: projectDoc.status,
              manager: projectDoc.managerId,
            }
          : null,
        allocatedBudget,
        actualSpent,
        pendingSpent,
        remainingBudget,
        burnRate,
        paidCount: stats?.paidCount || 0,
        pendingCount: stats?.pendingCount || 0,
        totalProposals: stats?.totalProposals || 0,
      },
    });
  } catch (error) {
    console.error('getProjectExpenseSummary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tổng hợp chi phí dự án.',
      error: error.message,
    });
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  getProjectExpenseSummary,
};
