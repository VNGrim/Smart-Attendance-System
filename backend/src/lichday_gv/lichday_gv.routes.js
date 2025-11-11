const express = require("express");
const router = express.Router();
const Ctr = require("./lichday_gv.controller");

// Lấy thông tin giảng viên
router.get("/teachers/:teacherId", Ctr.getTeacherInfo);

// Lấy lịch giảng dạy theo tuần
router.get("/schedule/:teacherId", Ctr.getTeacherSchedule);

module.exports = router;
