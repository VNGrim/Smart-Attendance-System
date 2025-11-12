const express = require("express");
const dayjs = require("dayjs");
const prisma = require("../config/prisma");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

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

    const where = {
      studentId: String(studentId),
      ...(status ? { status: String(status).toLowerCase() } : {}),
    };

    const dateEq = date ? dayjs(String(date)) : null;
    const fromD = from ? dayjs(String(from)) : null;
    const toD = to ? dayjs(String(to)) : null;

    const sessionFilter = {};
    if (classId) {
      sessionFilter.classId = String(classId).trim();
    }
    if (dateEq && dateEq.isValid()) {
      sessionFilter.date = dateEq.toDate();
    } else if (fromD?.isValid() || toD?.isValid()) {
      sessionFilter.date = {};
      if (fromD?.isValid()) sessionFilter.date.gte = fromD.toDate();
      if (toD?.isValid()) {
        const end = toD.endOf("day");
        sessionFilter.date.lte = end.toDate();
      }
    }
    if (Object.keys(sessionFilter).length > 0) {
      where.session = sessionFilter;
    }

    const skip = (page - 1) * pageSize;
    const [total, rows] = await Promise.all([
      prisma.attendanceRecord.count({ where }),
      prisma.attendanceRecord.findMany({
        where,
        include: {
          session: { select: { classId: true, date: true, slot: true, code: true } },
        },
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
        skip,
        take: pageSize,
      }),
    ]);

    let classIds = Array.from(
      new Set(
        rows
          .map((r) => String(r.session?.classId || "").trim())
          .filter((v) => v.length > 0)
      )
    );

    const classes = classIds.length
      ? await prisma.classes.findMany({
          where: { class_id: { in: classIds } },
          select: {
            class_id: true,
            class_name: true,
            subject_name: true,
            subject_code: true,
            // include related teacher (may be null)
            teacher: { select: { full_name: true } },
          },
        })
      : [];
    const classMap = new Map(classes.map((c) => [String(c.class_id).trim(), c]));

    const items = rows.map((r) => {
      const clsKey = String(r.session?.classId || "").trim();
      const info = classMap.get(clsKey) || null;
      const d = r.session?.date ? dayjs(r.session.date) : null;
      return {
        id: r.id,
        student_id: r.studentId,
        class_id: clsKey || null,
        class_name: info?.class_name || clsKey || "",
        subject_name: info?.subject_name || null,
        subject_code: info?.subject_code || null,
        date: d?.isValid() ? d.format("YYYY-MM-DD") : null,
        slot: r.session?.slot ?? null,
        attendance_code: r.session?.code || null,
        status: r.status || "unknown",
        recorded_at: r.recordedAt ? dayjs(r.recordedAt).toISOString() : null,
        teacher_name: info?.teacher?.full_name ?? null,
      };
    });

    return res.json({ success: true, data: { items, page, pageSize, total } });
  } catch (error) {
    console.error("student history list error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải lịch sử điểm danh" });
  }
});

module.exports = router;
