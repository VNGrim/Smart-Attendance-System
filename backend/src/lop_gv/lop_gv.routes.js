const express = require('express');
const LopController = require('./lop_gv.controller');

const router = express.Router();

// API lấy danh sách lớp học của giảng viên
router.get('/teacher/:teacherId/classes', LopController.getTeacherClasses);

// API lấy chi tiết lớp học
router.get('/classes/:classId', LopController.getClassDetails);

// API lấy danh sách sinh viên trong lớp
router.get('/classes/:classId/students', LopController.getClassStudents);

// API lấy thông tin giảng viên theo teacher_id
router.get('/teacher/:teacherId', LopController.getTeacherInfo);

// API lấy thông tin giảng viên từ user_code
router.get('/teacher/by-user/:userCode', LopController.getTeacherByUserCode);

// API lấy thông báo của lớp học
router.get('/classes/:classId/announcements', LopController.getClassAnnouncements);

// API tạo thông báo mới cho lớp
router.post('/classes/:classId/announcements', LopController.createClassAnnouncement);

module.exports = router;
