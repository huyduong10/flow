const router = require('express').Router();
const { authenticate, authorizeRoles } = require('../../middleware/authMiddleware');
const { ROLES } = require('../../utils/constants');
const {
  createMaterialRequest,
  getMaterialRequests,
  getMaterialRequestById,
} = require('./material-request.controller');

router.use(authenticate);

// POST /api/material-requests     - Trưởng thi công tạo đơn cấp vật tư
router.post('/', authorizeRoles(ROLES.SITE_MANAGER), createMaterialRequest);

// GET  /api/material-requests     - Lấy danh sách đơn
router.get('/', getMaterialRequests);

// GET  /api/material-requests/:id - Chi tiết 1 đơn
router.get('/:id', getMaterialRequestById);

module.exports = router;
