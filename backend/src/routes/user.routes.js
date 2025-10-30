const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma'); // đường dẫn tới prisma client
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(cookieParser());

// 🔹 LOGIN
router.post('/login', async (req, res) => {
  try {
    const { user_code, password } = req.body;

    if (!user_code || !password) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin đăng nhập.' });
    }

    const account = await prisma.accounts.findUnique({
      where: { user_code },
    });

    if (!account) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại.' });
    }

    const match = await bcrypt.compare(password, account.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Sai mật khẩu.' });
    }

    // Tạo JWT token
    const token = jwt.sign(
      {
        id: account.id,
        user_code: account.user_code,
        role: account.role,
        full_name: account.full_name || '',
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '2h' }
    );

    // Gửi token về client (hoặc set cookie nếu bạn muốn lưu trên trình duyệt)
    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: {
        token,
        user_code: account.user_code,
        role: account.role,
        full_name: account.full_name,
      },
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// 🔹 GET /api/me - trả về user hiện tại theo token
router.get('/me', auth, (req, res) => {
  const { userId, role, fullName } = req.user || {};
  return res.json({ userId, role, fullName });
});

module.exports = router;
