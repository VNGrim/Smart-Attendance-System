const express = require('express');
const prisma = require('../config/prisma');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../middleware/auth');
// const bcrypt = require('bcryptjs'); // TODO: migrate to hashed passwords later

const router = express.Router();
router.use(cookieParser());
router.use(express.json());

function signAccessToken(user) {
  return jwt.sign({ userId: user.user_code, role: user.role, fullName: user.full_name || user.user_code }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Login (tạm thời so sánh plaintext như hệ thống hiện tại; sẽ chuyển sang bcrypt sau)
router.post('/login', async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) return res.status(400).json({ success: false, message: 'Thiếu userId hoặc password' });

  try {
    const rows = await prisma.$queryRaw`SELECT * FROM accounts WHERE user_code = ${userId} AND password = ${password}`;
    const account = rows?.[0];
    if (!account) return res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập' });

    // Lấy tên hiển thị nếu có
    let fullName = account.user_code;
    if (account.role === 'student') {
      const s = await prisma.$queryRaw`SELECT full_name FROM students WHERE student_id = ${userId}`;
      fullName = s?.[0]?.full_name || fullName;
    } else if (account.role === 'teacher') {
      const t = await prisma.$queryRaw`SELECT full_name FROM teachers WHERE teacher_id = ${userId}`;
      fullName = t?.[0]?.full_name || fullName;
    }

    const token = jwt.sign({ userId: account.user_code, role: account.role, fullName }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60, // 1h (browser cap; JWT ttl theo JWT_EXPIRES_IN)
      path: '/',
    });

    return res.json({ success: true, role: account.role, userId: account.user_code, fullName });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('access_token', { path: '/' });
  return res.json({ success: true });
});

// Refresh (đơn giản: phát lại từ cookie hiện tại nếu còn hợp lệ, thực tế nên dùng refresh token riêng)
router.post('/refresh', (req, res) => {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const next = signAccessToken({ user_code: payload.userId, role: payload.role, full_name: payload.fullName });
    res.cookie('access_token', next, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 1000 * 60 * 60, path: '/' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

module.exports = router;
