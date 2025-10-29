const express = require("express");
const prisma = require("../config/prisma");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();
router.use(auth, requireRole("admin"));

const SUBJECT_MAP = {
  PRF192: "Programming Fundamentals",
  CEA201: "Computer Organization and Architecture",
  MAE101: "Mathematics for Engineering",
  SSL101c: "Academic Skills for University Success",
  CSI106: "Introduction to Computer Science",
  SWP391: "Software development project",
  SWT301: "SWT301",
};

const DEFAULT_STATUS = "Đang hoạt động";

const extractCohortDigits = (cohort) => {
  if (!cohort) return null;
  const match = String(cohort).trim().toUpperCase().match(/(\d{2,})$/);
  return match ? match[1] : null;
};

const normalizeStatus = (status) => {
  if (!status) return DEFAULT_STATUS;
  const value = String(status).trim();
  if (["Đang hoạt động", "Tạm nghỉ", "Kết thúc"].includes(value)) {
    return value;
  }
  return DEFAULT_STATUS;
};

const formatClassRecord = (record) => ({
  id: record.class_id,
  code: record.class_id,
  name: record.class_name,
  subjectCode: record.subject_code,
  subjectName: record.subject_name,
  cohort: record.cohort,
  major: record.major,
  teacherId: record.teacher_id,
  teacher: record.teacher ? record.teacher.full_name : record.teacherName || "",
  teacherName: record.teacher ? record.teacher.full_name : record.teacherName || null,
  teacherEmail: record.teacher ? record.teacher.email : null,
  students: record.studentCount || 0,
  status: record.status,
  createdAt: record.created_at,
});

async function generateClassCode(cohort) {
  const digits = extractCohortDigits(cohort);
  if (!digits) {
    const err = new Error("INVALID_COHORT");
    err.code = "INVALID_COHORT";
    throw err;
  }

  const prefix = `SE${digits}B`;
  const last = await prisma.classes.findFirst({
    where: { class_id: { startsWith: prefix } },
    orderBy: { class_id: "desc" },
  });

  const nextNumber = last ? parseInt(last.class_id.slice(prefix.length), 10) + 1 : 1;
  const suffix = Number.isFinite(nextNumber) ? nextNumber.toString() : "1";
  return `${prefix}${suffix}`;
}

router.get("/options", async (req, res) => {
  try {
    const [teacherRows, cohortRows] = await Promise.all([
      prisma.teachers.findMany({
        select: { teacher_id: true, full_name: true, email: true },
        orderBy: { full_name: "asc" },
      }),
      prisma.cohorts.findMany({
        select: { code: true },
        orderBy: { year: "asc" },
      }),
    ]);

    const teachers = teacherRows.map((row) => ({
      id: row.teacher_id,
      name: row.full_name,
      email: row.email || null,
    }));

    const cohorts = Array.from(
      new Set((cohortRows || []).map((row) => row.code).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return res.json({
      success: true,
      data: {
        teachers,
        cohorts,
        subjects: SUBJECT_MAP,
      },
    });
  } catch (error) {
    console.error("admin classes options error:", error);
    return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
});

router.get("/next-code", async (req, res) => {
  try {
    const { cohort } = req.query;
    if (!cohort || typeof cohort !== "string" || !cohort.trim()) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin khóa (cohort)" });
    }
    const code = await generateClassCode(cohort.trim());
    return res.json({ success: true, data: { code } });
  } catch (error) {
    if (error.code === "INVALID_COHORT") {
      return res.status(400).json({ success: false, message: "Định dạng khóa không hợp lệ (ví dụ: K19, K2023)." });
    }
    console.error("admin classes next-code error:", error);
    return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
});

router.get("/", async (req, res) => {
  try {
    const rows = await prisma.classes.findMany({
      orderBy: { created_at: "desc" },
      include: {
        teacher: {
          select: { teacher_id: true, full_name: true, email: true },
        },
      },
    });

    const data = rows.map((row) => formatClassRecord({ ...row, studentCount: 0 }));
    return res.json({ success: true, data });
  } catch (error) {
    console.error("admin classes list error:", error);
    return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, subjectCode, cohort, teacherId, major, code, status } = req.body || {};

    const normalizedSubjectCode = typeof subjectCode === "string" ? subjectCode.trim().toUpperCase() : "";
    if (!normalizedSubjectCode) {
      return res.status(400).json({ success: false, message: "Mã môn là bắt buộc" });
    }

    const subjectName = SUBJECT_MAP[normalizedSubjectCode];
    if (!subjectName) {
      return res.status(400).json({ success: false, message: "Mã môn không nằm trong danh sách được hỗ trợ" });
    }

    if (!cohort || typeof cohort !== "string" || !cohort.trim()) {
      return res.status(400).json({ success: false, message: "Khóa học là bắt buộc" });
    }

    let classCode = typeof code === "string" && code.trim() ? code.trim().toUpperCase() : null;
    if (!classCode) {
      classCode = await generateClassCode(cohort.trim());
    }

    const existing = await prisma.classes.findUnique({ where: { class_id: classCode } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Mã lớp đã tồn tại" });
    }

    let teacherIdToUse = null;
    if (teacherId && typeof teacherId === "string" && teacherId.trim()) {
      const teacher = await prisma.teachers.findUnique({ where: { teacher_id: teacherId.trim() } });
      if (!teacher) {
        return res.status(404).json({ success: false, message: "Không tìm thấy giảng viên" });
      }
      teacherIdToUse = teacher.teacher_id;
    }

    const className = typeof name === "string" && name.trim() ? name.trim() : subjectName;

    const created = await prisma.classes.create({
      data: {
        class_id: classCode,
        class_name: className,
        subject_code: normalizedSubjectCode,
        subject_name: subjectName,
        cohort: cohort.trim().toUpperCase(),
        teacher_id: teacherIdToUse,
        major: typeof major === "string" && major.trim() ? major.trim() : null,
        status: normalizeStatus(status),
        description: className,
      },
      include: {
        teacher: { select: { teacher_id: true, full_name: true, email: true } },
      },
    });

    const formatted = formatClassRecord({ ...created, studentCount: 0 });
    return res.status(201).json({ success: true, data: formatted });
  } catch (error) {
    if (error.code === "INVALID_COHORT") {
      return res.status(400).json({ success: false, message: "Định dạng khóa không hợp lệ (ví dụ: K19, K2023)." });
    }
    console.error("admin classes create error:", error);
    return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
});

router.put("/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const { name, subjectCode, cohort, teacherId, major, status } = req.body || {};

    const existing = await prisma.classes.findUnique({ where: { class_id: code } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    }

    const updates = {};

    if (subjectCode) {
      const normalizedSubjectCode = subjectCode.trim().toUpperCase();
      const subjectName = SUBJECT_MAP[normalizedSubjectCode];
      if (!subjectName) {
        return res.status(400).json({ success: false, message: "Mã môn không hợp lệ" });
      }
      updates.subject_code = normalizedSubjectCode;
      updates.subject_name = subjectName;
      updates.class_name = typeof name === "string" && name.trim() ? name.trim() : subjectName;
    }

    if (cohort && typeof cohort === "string" && cohort.trim()) {
      updates.cohort = cohort.trim().toUpperCase();
    }

    if (typeof major === "string") {
      updates.major = major.trim() || null;
    }

    if (name && typeof name === "string") {
      updates.class_name = name.trim();
      updates.description = name.trim();
    }

    if (status) {
      updates.status = normalizeStatus(status);
    }

    if (teacherId !== undefined) {
      if (teacherId && typeof teacherId === "string" && teacherId.trim()) {
        const teacher = await prisma.teachers.findUnique({ where: { teacher_id: teacherId.trim() } });
        if (!teacher) {
          return res.status(404).json({ success: false, message: "Không tìm thấy giảng viên" });
        }
        updates.teacher_id = teacher.teacher_id;
      } else {
        updates.teacher_id = null;
      }
    }

    const updated = await prisma.classes.update({
      where: { class_id: code },
      data: updates,
      include: {
        teacher: { select: { teacher_id: true, full_name: true, email: true } },
      },
    });

    const formatted = formatClassRecord({ ...updated, studentCount: 0 });
    return res.json({ success: true, data: formatted });
  } catch (error) {
    console.error("admin classes update error:", error);
    return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
});

module.exports = router;
