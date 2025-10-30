const express = require("express");
const dayjs = require("dayjs");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const {
  findActiveSessionByCode,
  getSessionWithClass,
  isStudentInClass,
  markStudentAttendance,
} = require("../diemdanh_gv/attendance.model");
const { jsonResponse } = require("../utils/json");

const router = express.Router();

router.use(auth, requireRole("student"));

router.post("/attend", async (req, res) => {
  try {
    const studentId = req.user?.userId;
    const { code } = req.body || {};
    if (!studentId) {
      return res.status(401).json({ success: false, message: "Không xác định được sinh viên" });
    }
    if (!code || typeof code !== "string") {
      return res.status(400).json({ success: false, message: "Thiếu mã điểm danh" });
    }
    const normalizedCode = code.trim().toUpperCase();
    const session = await findActiveSessionByCode(normalizedCode);
    if (!session) {
      return res.status(404).json({ success: false, message: "Mã điểm danh không tồn tại hoặc đã hết hạn" });
    }
    if (session.expires_at && dayjs(session.expires_at).isBefore(dayjs())) {
      return res.status(410).json({ success: false, message: "Mã điểm danh đã hết hạn" });
    }
    if (session.status !== "active") {
      return res.status(409).json({ success: false, message: "Phiên điểm danh đã đóng" });
    }

    const sessionDetail = await getSessionWithClass(session.id);
    if (!sessionDetail?.session_class?.class_id) {
      return res.status(500).json({ success: false, message: "Không xác định được lớp của phiên điểm danh" });
    }

    const classId = sessionDetail.session_class.class_id;
    const belongs = await isStudentInClass(studentId, classId);
    if (!belongs) {
      return res.status(403).json({ success: false, message: "Bạn không thuộc lớp của buổi điểm danh này" });
    }

    await markStudentAttendance(session.id, studentId, "present");

    return jsonResponse(res, {
      success: true,
      data: {
        sessionId: session.id,
        classId,
        slotId: session.slot_id,
        type: session.type,
        markedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("student attend error", error);
    return res.status(500).json({ success: false, message: "Không thể điểm danh" });
  }
});

module.exports = router;
