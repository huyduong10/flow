const router = require('express').Router();
const { login, getMe, getUsers } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// Public
router.post('/login', login);

// Protected
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, getUsers);

module.exports = router;
