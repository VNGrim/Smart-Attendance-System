const express = require('express');
const LopController = require('./lop_gv.controller');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(auth, requireRole('teacher'));

// API lấy danh sách lớp học của giảng viên
router.get('/classes', LopController.getTeacherClasses);

// API lấy danh sách sinh viên trong lớp
router.get('/classes/:classId/students', LopController.getClassStudents);

// API lấy tài liệu của lớp (mock)
router.get('/classes/:classId/materials', LopController.getClassMaterials);

// API lấy bảng điểm của lớp (mock)
router.get('/classes/:classId/grades', LopController.getClassGrades);

module.exports = router;
