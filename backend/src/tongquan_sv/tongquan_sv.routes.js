const express = require("express");
const prisma = require("../config/prisma");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

const DAY_MAP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const normalizeClassId = (value) => String(value ?? "").trim().toUpperCase();

const parseClassList = (classes) => {
  if (!classes || typeof classes !== "string") return [];
  return classes
    .split(",")
    .map((item) => normalizeClassId(item))
    .filter((item) => item.length > 0);
};

const isActiveClass = (status) => {
  if (!status) return true;
  const normalized = String(status).trim().toLowerCase();
  return [
    "đang hoạt động",
    "dang hoat dong",
    "active",
  ].includes(normalized.normalize("NFD").replace(/\p{Diacritic}/gu, ""));
};

router.use(auth, requireRole("student"));

router.get("/summary", async (req, res) => {
  try {
    const studentId = req.user?.userId;
    if (!studentId) {
      return res.status(401).json({ success: false, message: "Không xác định được sinh viên" });
    }

    const student = await prisma.students.findUnique({
      where: { student_id: studentId },
      select: {
        student_id: true,
        full_name: true,
        classes: true,
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thông tin sinh viên" });
    }

    const classList = parseClassList(student.classes);

    let activeClassesCount = 0;
    if (classList.length) {
      const classes = await prisma.classes.findMany({
        where: { class_id: { in: classList } },
        select: { class_id: true, status: true },
      });
      if (classes.length) {
        activeClassesCount = classes.filter((item) => isActiveClass(item.status)).length;
      } else {
        activeClassesCount = classList.length;
      }
    }

    let sessionsToday = 0;
    if (classList.length) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const dayKey = DAY_MAP[now.getDay()] ?? "Mon";

      sessionsToday = await prisma.timetable.count({
        where: {
          classes: { in: classList },
          OR: [
            { date: { gte: startOfDay, lt: endOfDay } },
            { AND: [{ date: null }, { day_of_week: dayKey }] },
          ],
        },
      });
    }

    let attendanceRate = null;
    if (student.student_id) {
      const records = await prisma.attendanceRecord.findMany({
        where: {
          studentId: student.student_id,
          session: classList.length
            ? { classId: { in: classList } }
            : undefined,
        },
        select: { status: true },
      });

      const totalRecords = records.length;
      if (totalRecords > 0) {
        const presentRecords = records.filter((item) => item.status === "present").length;
        attendanceRate = Number(((presentRecords / totalRecords) * 100).toFixed(1));
      }
    }

    return res.json({
      success: true,
      data: {
        classCount: activeClassesCount,
        sessionsToday,
        attendanceRate,
        upcomingExamDate: null,
      },
    });
  } catch (error) {
    console.error("student overview summary error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải dữ liệu tổng quan" });
  }
});

module.exports = router;
