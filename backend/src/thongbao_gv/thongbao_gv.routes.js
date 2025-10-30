const express = require('express');
const ThongBaoGVController = require('./thongbao_gv.controller');

const router = express.Router();

// API lấy danh sách thông báo cho giảng viên
router.get('/announcements', ThongBaoGVController.getAllAnnouncements);

// API lấy chi tiết thông báo theo ID cho giảng viên
router.get('/announcements/:id', ThongBaoGVController.getAnnouncementById);

module.exports = router;

