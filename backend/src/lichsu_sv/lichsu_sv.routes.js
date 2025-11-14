const express = require("express");
const dayjs = require("dayjs");
const prisma = require("../config/prisma");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

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

router.use(auth, requireRole("student"));

// GET /api/lichsu_sv/history
// Query: date (YYYY-MM-DD exact) | from (YYYY-MM-DD) & to (YYYY-MM-DD), status (present|absent|excused), classId, page, pageSize
router.get("/history", async (req, res) => {
  try {
    const user = req.user || {};
    const studentId = user.userId || user.user_code || user.studentId;
    if (!studentId) {
      return res.status(401).json({ success: false, message: "Không xác định được sinh viên" });
    }

    const { date, from, to, status, classId } = req.query || {};
    let page = parseInt(String(req.query?.page ?? "1"), 10);
    let pageSize = parseInt(String(req.query?.pageSize ?? "20"), 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > 100) pageSize = 20;

    const student = await prisma.students.findUnique({
      where: { student_id: String(studentId) },
      select: { classes: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thông tin sinh viên" });
    }

    const classList = parseClassList(student.classes);
    const classListUpper = Array.from(new Set(classList.map((item) => item.toUpperCase())));
    let classIdFilters = Array.from(new Set([...classList, ...classListUpper]));

    if (classId) {
      const cls = String(classId).trim();
      const clsUpper = cls.toUpperCase();
      classIdFilters = Array.from(new Set([cls, clsUpper]));
    }

    if (!classIdFilters.length) {
      return res.json({ success: true, data: { items: [], page, pageSize, total: 0 } });
    }

    const dateEq = date ? dayjs(String(date)) : null;
    const fromD = from ? dayjs(String(from)) : null;
    const toD = to ? dayjs(String(to)) : null;

    const sessionWhere = {
      classId: { in: classIdFilters },
    };

    if (dateEq && dateEq.isValid()) {
      sessionWhere.date = dateEq.toDate();
    } else if (fromD?.isValid() || toD?.isValid()) {
      sessionWhere.date = {};
      if (fromD?.isValid()) sessionWhere.date.gte = fromD.toDate();
      if (toD?.isValid()) {
        const end = toD.endOf("day");
        sessionWhere.date.lte = end.toDate();
      }
    }

    const skip = (page - 1) * pageSize;

    const [total, sessions] = await Promise.all([
      prisma.attendanceSession.count({ where: sessionWhere }),
      prisma.attendanceSession.findMany({
        where: sessionWhere,
        include: {
          records: {
            where: { studentId: String(studentId) },
            select: { id: true, status: true, recordedAt: true },
            take: 1,
          },
          session_class: {
            select: {
              class_id: true,
              class_name: true,
              subject_name: true,
              subject_code: true,
              teacher: { select: { full_name: true } },
            },
          },
        },
        orderBy: [{ date: "desc" }, { slot: "asc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
      }),
    ]);

    const items = sessions.map((s) => {
      const info = s.session_class || {};
      const d = s.date ? dayjs(s.date) : null;
      const rec = s.records?.[0] || null;
      let statusValue = rec?.status || null;
      if (!statusValue && (s.status === "ended" || s.status === "closed")) {
        statusValue = "absent";
      }
      if (statusValue && status) {
        const normalizedStatus = String(statusValue).toLowerCase();
        const filterStatus = String(status).toLowerCase();
        if (normalizedStatus !== filterStatus) {
          return null;
        }
      }

      const clsKey = String(s.classId || "").trim();
      return {
        id: rec?.id || null,
        student_id: String(studentId),
        class_id: clsKey || null,
        class_name: info.class_name || clsKey || "",
        subject_name: info.subject_name || null,
        subject_code: info.subject_code || null,
        date: d?.isValid() ? d.format("YYYY-MM-DD") : null,
        slot: s.slot ?? null,
        attendance_code: s.code || null,
        status: statusValue || "unknown",
        recorded_at: rec?.recordedAt ? dayjs(rec.recordedAt).toISOString() : null,
        teacher_name: info.teacher?.full_name ?? null,
      };
    }).filter(Boolean);

    return res.json({ success: true, data: { items, page, pageSize, total } });
  } catch (error) {
    console.error("student history list error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải lịch sử điểm danh" });
  }
});

module.exports = router;
