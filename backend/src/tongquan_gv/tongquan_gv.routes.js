const express = require("express");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const controller = require("./tongquan_gv.controller");

const router = express.Router();

router.use(auth, requireRole("teacher"));

// GET /api/teacher/dashboard/stats - Thống kê tổng quan
router.get("/stats", controller.getTeacherStats);

// GET /api/teacher/dashboard/week-schedule - Lịch dạy tuần này
router.get("/week-schedule", controller.getWeekSchedule);

// GET /api/teacher/dashboard/three-days - Lịch 3 ngày (hôm qua, hôm nay, ngày mai)
router.get("/three-days", controller.getThreeDaysSchedule);

// GET /api/teacher/dashboard/notifications - Thông báo gần nhất
router.get("/notifications", controller.getRecentNotifications);

// GET /api/teacher/dashboard/latest-notification - Thông báo đơn mới nhất
router.get("/latest-notification", controller.getLatestNotification);

// GET /api/teacher/dashboard/attendance-note - Ghi chú điểm danh gần nhất
router.get("/attendance-note", controller.getLatestAttendanceNote);

module.exports = router;
