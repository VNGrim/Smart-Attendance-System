const express = require("express");
const router = express.Router();
const Ctr = require("./lichhoc_hienthi.controller");

// Lấy thông tin sinh viên
router.get("/students/:studentId", Ctr.getStudentInfo);

// Lấy thời khóa biểu theo studentId
router.get("/schedule/:studentId", Ctr.getStudentSchedule);

// Admin: lấy toàn bộ lịch học dạng lưới / danh sách
const adminScheduleRoutes = require("../lichhoc_ad/lichhoc_ad.routes");
router.use("/admin", adminScheduleRoutes);

module.exports = router;
