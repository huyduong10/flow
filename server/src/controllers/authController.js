const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * POST /api/auth/login
 * Đăng nhập và trả về JWT token
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate đầu vào
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu.',
      });
    }

    // Tìm user (bao gồm password vì field có select:false)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa.',
      });
    }

    // So sánh password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác.',
      });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Trả về thông tin user (không có password)
    const userObj = user.toJSON();

    res.json({
      success: true,
      message: 'Đăng nhập thành công.',
      data: {
        token,
        user: userObj,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi đăng nhập.',
    });
  }
};

/**
 * GET /api/auth/me
 * Lấy thông tin user hiện tại từ token
 */
const getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      data: { user: req.user },
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống.',
    });
  }
};

/**
 * GET /api/auth/users
 * Lấy danh sách nhân sự (lọc theo role, VD: SITE_MANAGER)
 */
const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = { isActive: true };
    if (role) filter.role = role;

    const users = await User.find(filter).select('-password').sort({ fullName: 1 });
    return res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách người dùng.',
    });
  }
};

module.exports = { login, getMe, getUsers };
