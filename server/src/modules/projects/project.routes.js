const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  getProjectExpenseSummary,
} = require('./project.controller');
const { authenticate, authorizeRoles } = require('../../middleware/authMiddleware');
const { ROLES } = require('../../utils/constants');

// Tất cả các route đều yêu cầu đăng nhập
router.use(authenticate);

// GET /api/projects/expense-summary: Thống kê chi phí dự án
router.get('/expense-summary', getProjectExpenseSummary);

// GET /api/projects: Danh sách dự án
router.get('/', getProjects);

// GET /api/projects/:id: Chi tiết dự án
router.get('/:id', getProjectById);

// POST /api/projects: Tạo dự án mới (Chỉ CEO & CHAIRMAN có thẩm quyền)
router.post(
  '/',
  authorizeRoles(ROLES.CEO, ROLES.CHAIRMAN),
  createProject
);

module.exports = router;
