const express = require("express");
const router = express.Router();
const Ctr = require("./lichhoc_hienthi.controller");

// Lấy thông tin sinh viên
router.get("/students/:studentId", Ctr.getStudentInfo);

// Lấy thời khóa biểu theo studentId
router.get("/schedule/:studentId", Ctr.getStudentSchedule);

module.exports = router;

