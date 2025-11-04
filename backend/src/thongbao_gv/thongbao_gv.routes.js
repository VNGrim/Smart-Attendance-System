const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ThongBaoGVController = require('./thongbao_gv.controller');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(auth, requireRole('teacher'));

// setup multer storage (align with index.js static: path.join(__dirname, 'uploads'))
const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '');
    cb(null, `ann-${unique}${ext}`);
  },
});
const upload = multer({ storage });

// API lấy danh sách thông báo cho giảng viên
router.get('/announcements', ThongBaoGVController.getAllAnnouncements);

// API lấy chi tiết thông báo theo ID cho giảng viên
router.get('/announcements/:id', ThongBaoGVController.getAnnouncementById);

// API gửi phản hồi cho thông báo
router.post('/announcements/:id/replies', ThongBaoGVController.addReply);

// API lấy phản hồi của chính giảng viên
router.get('/announcements/:id/replies/me', ThongBaoGVController.getMyReplies);

// API lấy danh sách lớp "đang hoạt động" do giảng viên hiện tại phụ trách
router.get('/classes', ThongBaoGVController.getActiveClasses);

// API giảng viên gửi thông báo (hỗ trợ file đính kèm)
router.post('/announcements', upload.single('file'), ThongBaoGVController.createAnnouncement);

module.exports = router;

