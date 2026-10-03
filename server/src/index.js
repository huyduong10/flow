require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const connectDB = require('./config/database');

const app = express();

// ─── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads'))
);

// ─── Health Check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Flow Procurement API',
  });
});

// ─── Routes ─────────────────────────────────────────────────
const { authenticate, authorizeRoles } = require('./middleware/authMiddleware');
const { ROLES } = require('./utils/constants');
const {
  createVendorQuote,
  getVendorQuote,
  approveVendorQuote,
} = require('./controllers/vendorController');

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/requests', require('./routes/purchaseRequest.routes'));
app.use('/api/vendor-quotes', require('./routes/vendor.routes'));
app.use('/api/contracts', require('./routes/contract.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/warehouse', require('./modules/warehouse/warehouse.routes'));
app.use('/api/material-requests', require('./modules/material-requests/material-request.routes'));

// ─── Nested vendor routes on /api/requests/:id ──────────────
// POST   /api/requests/:id/vendors          - Thu mua nhập danh sách báo giá và chọn NCC tối ưu
// GET    /api/requests/:id/vendors          - Xem danh sách báo giá
// PATCH  /api/requests/:id/vendor-approval  - CEO & CHAIRMAN duyệt lựa chọn NCC
app.post(
  '/api/requests/:id/vendors',
  authenticate,
  authorizeRoles(ROLES.PROCUREMENT),
  createVendorQuote
);
app.get('/api/requests/:id/vendors', authenticate, getVendorQuote);
app.patch(
  '/api/requests/:id/vendor-approval',
  authenticate,
  authorizeRoles(ROLES.CEO, ROLES.CHAIRMAN),
  approveVendorQuote
);

// ─── Global Error Handler ──────────────────────────────────
app.use((err, req, res, next) => {
  // Xử lý lỗi Multer (upload file)
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'File quá lớn. Tối đa 10MB mỗi file.',
      LIMIT_FILE_COUNT: 'Quá nhiều file. Tối đa 5 file.',
      LIMIT_UNEXPECTED_FILE: 'Field upload không hợp lệ.',
    };
    return res.status(400).json({
      success: false,
      message: messages[err.code] || `Lỗi upload: ${err.message}`,
    });
  }

  console.error('❌ Error:', err.message);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Lỗi hệ thống',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Serve Frontend in Production (Render Unified Deployment) ───
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// ─── 404 Handler ────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} không tồn tại`,
  });
});

// ─── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  });
}

module.exports = app;

