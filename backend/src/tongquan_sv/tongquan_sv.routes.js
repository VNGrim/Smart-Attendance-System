const express = require("express");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const prisma = require("../config/prisma");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const ThongBaoController = require("../thongbao_hienthi/thongbao_hienthi.controller");

dayjs.extend(utc);

const router = express.Router();

const DAY_MAP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parseClassList = (classes) => {
  if (!classes || typeof classes !== "string") return [];
  const tokens = String(classes)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const seen = new Set();
  const result = [];
  for (const token of tokens) {
    const key = token.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(token);
  }
  return result;
};

const formatTime = (value) => {
  if (!value) return null;
  return dayjs(value).utc().format("HH:mm");
};

const buildDateTime = (dateValue, timeValue, fallbackDate) => {
  if (!timeValue) return null;
  const time = dayjs(timeValue).utc();
  const base = dateValue ? dayjs(dateValue) : dayjs(fallbackDate);
  if (!base.isValid()) return null;
  return base
    .hour(time.hour())
    .minute(time.minute())
    .second(0)
    .millisecond(0);
};

const isActiveClass = (status) => {
  if (!status) return true;
  const normalized = String(status).trim();
  const simplified = normalized
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (!simplified) return true;

  const ACTIVE_VALUES = new Set([
    "dang hoat dong",
    "dang hoc",
    "dang day",
    "hoat dong",
    "hoc",
    "active",
    "ongoing",
    "inprogress",
  ]);

  if (ACTIVE_VALUES.has(simplified)) return true;
  if (simplified.includes("dang") || simplified.includes("active") || simplified.includes("hoc")) {
    return true;
  }
  return false;
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
    const classListUpper = Array.from(new Set(classList.map((item) => item.toUpperCase())));
    const classIdFilters = Array.from(new Set([...classList, ...classListUpper]));

    let activeClassesCount = 0;
    if (classIdFilters.length) {
      const classes = await prisma.classes.findMany({
        where: { class_id: { in: classIdFilters } },
        select: { class_id: true, status: true },
      });
      if (classes.length) {
        const active = classes.filter((item) => isActiveClass(item.status)).length;
        activeClassesCount = active > 0 ? active : classList.length;
      } else {
        activeClassesCount = classList.length;
      }
    }

    let sessionsToday = 0;
    if (classIdFilters.length) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const countDistinctSessions = (rows = []) => {
        const seen = new Set();
        for (const row of rows) {
          const classKey = String(row.classes ?? "").trim().toUpperCase();
          const slotKey = Number(row.slot_id ?? 0);
          const dayKey = String(row.day_of_week ?? "").trim().toUpperCase();
          if (!classKey || !slotKey) continue;
          const key = `${classKey}|${slotKey}|${dayKey}`;
          if (!seen.has(key)) {
            seen.add(key);
          }
        }
        return seen.size;
      };

      const datedSessions = await prisma.timetable.findMany({
        where: {
          classes: { in: classIdFilters },
          date: { gte: startOfDay, lt: endOfDay },
        },
        select: {
          classes: true,
          slot_id: true,
          day_of_week: true,
        },
      });

      sessionsToday = countDistinctSessions(datedSessions);

      if (sessionsToday === 0) {
        const dayKey = DAY_MAP[now.getDay()] ?? "Mon";
        const weeklySessions = await prisma.timetable.findMany({
          where: {
            classes: { in: classIdFilters },
            date: null,
            day_of_week: dayKey,
          },
          select: {
            classes: true,
            slot_id: true,
            day_of_week: true,
          },
        });
        sessionsToday = countDistinctSessions(weeklySessions);
      }
    }

    let attendanceRate = null;
    if (student.student_id) {
      const records = await prisma.attendanceRecord.findMany({
        where: {
          studentId: student.student_id,
          session: classListUpper.length
            ? { classId: { in: classListUpper } }
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

router.get("/schedule/today", async (req, res) => {
  try {
    const studentId = req.user?.userId;
    if (!studentId) {
      return res.status(401).json({ success: false, message: "Không xác định được sinh viên" });
    }

    const student = await prisma.students.findUnique({
      where: { student_id: studentId },
      select: {
        student_id: true,
        classes: true,
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thông tin sinh viên" });
    }

    const classList = parseClassList(student.classes);
    const classListUpper = Array.from(new Set(classList.map((item) => item.toUpperCase())));
    const classIdFilters = Array.from(new Set([...classList, ...classListUpper]));

    if (!classIdFilters.length) {
      return res.json({ success: true, data: [] });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const dayKey = DAY_MAP[now.getDay()] ?? "Mon";

    const [datedSessions, weeklySessions] = await Promise.all([
      prisma.timetable.findMany({
        where: {
          classes: { in: classIdFilters },
          date: { gte: startOfDay, lt: endOfDay },
        },
        include: { time_slots: true },
        orderBy: [
          { slot_id: "asc" },
          { classes: "asc" },
        ],
      }),
      prisma.timetable.findMany({
        where: {
          classes: { in: classIdFilters },
          date: null,
          day_of_week: dayKey,
        },
        include: { time_slots: true },
        orderBy: [
          { slot_id: "asc" },
          { classes: "asc" },
        ],
      }),
    ]);

    const sessionMap = new Map();
    const addSession = (row) => {
      if (!row) return;
      const key = `${String(row.classes || "").trim().toUpperCase()}|${row.slot_id}`;
      const existing = sessionMap.get(key);
      if (!existing) {
        sessionMap.set(key, row);
        return;
      }
      if (!existing.date && row.date) {
        sessionMap.set(key, row);
      }
    };

    datedSessions.forEach(addSession);
    weeklySessions.forEach(addSession);

    const sessions = Array.from(sessionMap.values());
    const todayIso = dayjs(startOfDay).format("YYYY-MM-DD");
    if (!sessions.length) {
      return res.json({ success: true, data: [] });
    }

    const classIds = Array.from(new Set(sessions.map((item) => String(item.classes || "").trim())));
    const classesData = classIds.length
      ? await prisma.classes.findMany({
          where: { class_id: { in: classIds } },
          select: {
            class_id: true,
            class_name: true,
            subject_name: true,
            subject_code: true,
          },
        })
      : [];
    const classMap = new Map(classesData.map((item) => [String(item.class_id).trim().toUpperCase(), item]));

    const nowMoment = dayjs();
    const fallbackBase = dayjs(startOfDay);
    const data = sessions
      .map((row) => {
        const classKey = String(row.classes || "").trim().toUpperCase();
        const classInfo = classMap.get(classKey) || null;
        const startTime = formatTime(row.time_slots?.start_time);
        const endTime = formatTime(row.time_slots?.end_time);

        const startMoment = buildDateTime(row.date, row.time_slots?.start_time, startOfDay) || fallbackBase;
        const endMoment = buildDateTime(row.date, row.time_slots?.end_time, startOfDay) || fallbackBase;
        const scheduleIso = row.date ? dayjs(row.date).format("YYYY-MM-DD") : null;

        if (scheduleIso && scheduleIso !== todayIso) {
          return null;
        }
        if (!row.date) {
          const rowDay = String(row.day_of_week || "").trim();
          if (rowDay && rowDay !== dayKey) {
            return null;
          }
        }

        let status = "upcoming";
        if (startMoment && endMoment) {
          if (nowMoment.isAfter(endMoment)) status = "finished";
          else if (nowMoment.isBefore(startMoment)) status = "upcoming";
          else status = "ongoing";
        }

        let statusLabel = "Sắp diễn ra";
        if (status === "ongoing") statusLabel = "Đang học";
        else if (status === "finished") statusLabel = "Đã kết thúc";

        return {
          slot: Number(row.slot_id) || null,
          startTime,
          endTime,
          subjectName: classInfo?.subject_name || row.subject_name || classKey,
          subjectCode: classInfo?.subject_code || null,
          classId: classKey,
          className: classInfo?.class_name || classKey,
          status,
          statusLabel,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.slot == null && b.slot == null) return 0;
        if (a.slot == null) return 1;
        if (b.slot == null) return -1;
        return a.slot - b.slot;
      });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("student overview today schedule error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải lịch học hôm nay" });
  }
});

router.get("/announcements/latest", async (req, res) => {
  try {
    const actor = await ThongBaoController.resolveActorFromRequest(req);
    const classTokens = parseClassList(actor?.class)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

      const targetFilters = [
      // Global/all-school announcements
      { target: { contains: "Toàn", mode: "insensitive" } },
      { target: { contains: "All", mode: "insensitive" } },
      // Student-targeted announcements
      { target: { contains: "Sinh", mode: "insensitive" } },
      { target: { contains: "student", mode: "insensitive" } },
      // Class-specific matches (target contains class code)
      ...classTokens.map((token) => ({ target: { contains: token, mode: "insensitive" } })),
    ];

    // If recipients column is an array (e.g., Postgres text[]), array_contains will work.
    // If it's stored differently, target-based filters above should still surface most relevant records.
    const recipientFilters = classTokens.map((token) => ({ recipients: { array_contains: token } }));

    const announcements = await prisma.announcements.findMany({
      where: {
        OR: [...targetFilters, ...recipientFilters],
      },
      orderBy: { created_at: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        content: true,
        created_at: true,
        sender: true,
        target: true,
        category: true,
        type: true,
        allow_reply: true,
      },
    });

    const normalizeAnnouncementType = (value) => {
      const text = (value || "").toLowerCase();
      if (text.includes("giảng") || text.includes("teacher") || text.includes("lecturer")) return "teacher";
      if (text.includes("trường") || text.includes("school") || text.includes("phòng") || text.includes("ban")) return "school";
      return "other";
    };

    const formatRecord = (record) => {
      const createdAt = record.created_at instanceof Date ? record.created_at : record.created_at ? new Date(record.created_at) : null;
      const date = createdAt ? dayjs(createdAt) : null;
      return {
        id: record.id,
        title: record.title ?? "",
        content: record.content ?? "",
        sender: record.sender ?? "",
        target: record.target ?? "",
        category: record.category ?? "",
        type: normalizeAnnouncementType(record.type ?? record.category ?? ""),
        createdAt: createdAt ? createdAt.toISOString() : null,
        createdDate: date?.isValid() ? date.format("DD/MM") : null,
        allowReply: Boolean(record.allow_reply),
      };
    };

    const formatted = announcements.map(formatRecord);

    const takeTop = (items, typeFilter) => {
      if (typeFilter === "all") return items.slice(0, 3);
      const normalized = typeFilter === "teacher" ? "teacher" : typeFilter === "school" ? "school" : typeFilter;
      return items.filter((item) => (item.type || "").toLowerCase() === normalized).slice(0, 3);
    };

    const all = takeTop(formatted, "all");
    const teacher = takeTop(formatted, "teacher");
    const school = takeTop(formatted, "school");

    return res.json({
      success: true,
      data: { all, teacher, school },
    });
  } catch (error) {
    console.error("student overview announcements latest error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải thông báo" });
  }
});

module.exports = router;
