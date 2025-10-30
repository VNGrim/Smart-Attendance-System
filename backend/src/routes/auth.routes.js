const express = require('express');
const prisma = require('../config/prisma');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(cookieParser());
router.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

function signAccessToken(user) {
  return jwt.sign(
    { userId: user.user_code, role: user.role, fullName: user.full_name || user.user_code },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}


// 🔹 Login
router.post('/login', async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password)
    return res.status(400).json({ success: false, message: 'Thiếu userId hoặc password' });

  try {
    const rows = await prisma.$queryRaw`SELECT * FROM accounts WHERE user_code = ${userId}`;
    const account = rows?.[0];
    if (!account)
      return res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập' });

    // So sánh bcrypt
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Sai mật khẩu' });

    // Lấy tên hiển thị
    let fullName = account.user_code;
    if (account.role === 'student') {
      const s = await prisma.$queryRaw`SELECT full_name FROM students WHERE student_id = ${userId}`;
      fullName = s?.[0]?.full_name || fullName;
    } else if (account.role === 'teacher') {
      const t = await prisma.$queryRaw`SELECT full_name FROM teachers WHERE teacher_id = ${userId}`;
      fullName = t?.[0]?.full_name || fullName;
    }

    // ← Đây chính là dòng tạo token JWT
    const token = jwt.sign(
      { user_code: account.user_code, role: account.role, fullName },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60,
      path: '/',
    });

    return res.json({ success: true, role: account.role, userId: account.user_code, fullName });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});


// 🔹 Logout
router.post('/logout', (req, res) => {
  res.clearCookie('access_token', { path: '/' });
  return res.json({ success: true });
});

router.post('/change-password', auth, async (req, res) => {
  const userCode = req.user?.user_code;
  const { oldPassword, newPassword, confirmPassword } = req.body || {};

  // 1️⃣ Kiểm tra dữ liệu đầu vào
  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'Thiếu mật khẩu cũ hoặc mật khẩu mới/nhập lại' });
  }

  try {
    // 2️⃣ Lấy tài khoản
    const acc = await prisma.accounts.findUnique({ where: { user_code: userCode } });
    if (!acc) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });

    // 3️⃣ Kiểm tra mật khẩu cũ
    const ok = await bcrypt.compare(oldPassword, acc.password);
    if (!ok) return res.status(400).json({ success: false, message: 'Mật khẩu cũ không đúng' });

    // 4️⃣ Mật khẩu mới khác mật khẩu cũ
    if (oldPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải khác mật khẩu cũ' });
    }

    // 5️⃣ Kiểm tra độ dài mật khẩu mới
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải từ 6 ký tự trở lên' });
    }

    // 6️⃣ Kiểm tra mật khẩu xác nhận
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu xác nhận không khớp với mật khẩu mới' });
    }

    // 7️⃣ Hash và cập nhật mật khẩu
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.accounts.update({ where: { id: acc.id }, data: { password: hashed } });

    return res.json({ success: true, message: 'Đổi mật khẩu thành công' });

  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});




  
  // ✅ Dòng này phải có ở cuối file!
  module.exports = router;
  