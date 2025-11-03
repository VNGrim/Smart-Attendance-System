const express = require('express');
const ThongBaoGVController = require('./thongbao_gv.controller');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(auth, requireRole('teacher'));

// API lấy danh sách thông báo cho giảng viên
router.get('/announcements', ThongBaoGVController.getAllAnnouncements);

// API lấy chi tiết thông báo theo ID cho giảng viên
router.get('/announcements/:id', ThongBaoGVController.getAnnouncementById);

// API gửi phản hồi cho thông báo
router.post('/announcements/:id/replies', ThongBaoGVController.addReply);

// API lấy phản hồi của chính giảng viên
router.get('/announcements/:id/replies/me', ThongBaoGVController.getMyReplies);

module.exports = router;

