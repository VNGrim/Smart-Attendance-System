const express = require("express");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const controller = require("./attendance.controller");

const router = express.Router();

router.use(auth, requireRole("teacher"));

router.get("/classes", controller.listTeacherClasses);
router.get("/classes/:classId/slots", controller.listClassSlots);
router.post("/sessions", controller.createOrGetSession);
router.post("/session/end", controller.endAttendanceSession);
router.post("/sessions/:id/reset", controller.resetSessionCode);
router.post("/sessions/:id/close", controller.closeSession);
router.get("/sessions/:id", controller.getSessionDetail);
router.get("/session/:id", controller.getSessionWithRecords);
router.get("/sessions/:id/students", controller.getSessionStudents);
router.post("/sessions/:id/manual", controller.updateManualAttendance);
router.get("/sessions", controller.listSessionsByDate);
router.patch("/session/:id/record/:recordId", controller.patchAttendanceRecord);
router.delete("/session/:id", controller.deleteSession);

module.exports = router;
