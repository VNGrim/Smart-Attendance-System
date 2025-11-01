const express = require('express');
const ThongBaoController = require('./thongbao_hienthi.controller');
const { auth } = require('../middleware/auth');

const router = express.Router();

// API lấy danh sách thông báo
router.get('/announcements', ThongBaoController.getAllAnnouncements);

// API lấy chi tiết thông báo theo ID
router.get('/announcements/:id', ThongBaoController.getAnnouncementById);

// API gửi phản hồi cho thông báo
router.post('/announcements/:id/replies', auth, ThongBaoController.addReply);

// API lấy thông tin sinh viên theo student_id
router.get('/students/:studentId', ThongBaoController.getStudentInfo);

// API lấy thông tin sinh viên từ user_code (từ session/login)
router.get('/students/by-user/:userCode', ThongBaoController.getStudentByUserCode);

module.exports = router;

