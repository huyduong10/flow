const router = require('express').Router();
const { authenticate, authorizeRoles } = require('../../middleware/authMiddleware');
const { ROLES } = require('../../utils/constants');
const {
  getPendingRequests,
  getRequestById,
  checkAndProcessStock,
  confirmSiteReceipt,
  getWarehouseHistory,
} = require('./warehouse.controller');

// Tất cả endpoints kho đều cần xác thực đăng nhập
router.use(authenticate);

// GET   /api/warehouse/pending-requests    - Lấy danh sách đơn PENDING_WAREHOUSE (Kho, CEO)
router.get(
  '/pending-requests',
  authorizeRoles(ROLES.WAREHOUSE_MANAGER, ROLES.CEO, ROLES.CHAIRMAN),
  getPendingRequests
);

// GET   /api/warehouse/history             - Lấy toàn bộ lịch sử đơn kho
router.get(
  '/history',
  authorizeRoles(ROLES.WAREHOUSE_MANAGER, ROLES.CEO, ROLES.CHAIRMAN),
  getWarehouseHistory
);

// GET   /api/warehouse/requests/:id        - Chi tiết đơn để kiểm tra tồn kho
router.get(
  '/requests/:id',
  authorizeRoles(ROLES.WAREHOUSE_MANAGER, ROLES.SITE_MANAGER, ROLES.CEO, ROLES.CHAIRMAN),
  getRequestById
);

// PATCH /api/warehouse/requests/:id/check  - Quản lý kho kiểm tra thực cấp & tách đơn
router.patch(
  '/requests/:id/check',
  authorizeRoles(ROLES.WAREHOUSE_MANAGER),
  checkAndProcessStock
);

// PATCH /api/warehouse/requests/:id/site-confirm - Trưởng thi công xác nhận nhận hàng
router.patch(
  '/requests/:id/site-confirm',
  authorizeRoles(ROLES.SITE_MANAGER),
  confirmSiteReceipt
);

module.exports = router;
