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

const FALLBACK_CLASSES = [];

let fallbackStore = [];

const cloneFallback = () => fallbackStore.map((item) => ({ ...item }));

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

  const simplified = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const mapping = {
    "dang hoat dong": "Đang hoạt động",
    "hoat dong": "Đang hoạt động",
    active: "Đang hoạt động",
    "tam nghi": "Tạm nghỉ",
    paused: "Tạm nghỉ",
    inactive: "Tạm nghỉ",
    suspended: "Tạm nghỉ",
    "ket thuc": "Kết thúc",
    finished: "Kết thúc",
    completed: "Kết thúc",
    ended: "Kết thúc",
    closed: "Kết thúc",
  };

  return mapping[simplified] || DEFAULT_STATUS;
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

const normalizeClassCode = (value) => {
  if (!value) return "";
  return String(value).trim().toUpperCase();
};

const splitClasses = (value) => {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
};

const joinClasses = (list) => Array.from(new Set(list.filter(Boolean)));

const mapStudentRecord = (student) => ({
  studentId: student.student_id,
  fullName: student.full_name,
  email: student.email || "",
  status: student.status,
  course: student.course,
});

async function generateClassCode(cohort) {
  const digits = extractCohortDigits(cohort);
  if (!digits) {
    const err = new Error("INVALID_COHORT");
    err.code = "INVALID_COHORT";
    throw err;
  }

  const prefix = `SE${digits}B`;
  let lastCode = null;

  if (prisma?.classes) {
    try {
      const last = await prisma.classes.findFirst({
        where: { class_id: { startsWith: prefix } },
        orderBy: { class_id: "desc" },
      });
      if (last?.class_id) {
        lastCode = last.class_id;
      }
    } catch (error) {
      console.error("admin classes next-code lookup error:", error);
    }
  }

  if (!lastCode) {
    const source = fallbackStore.length ? fallbackStore : FALLBACK_CLASSES;
    const fallbackMatch = source
      .filter((item) =>
        typeof item.class_id === "string" && item.class_id.startsWith(prefix)
      )
      .map((item) => item.class_id)
      .sort((a, b) => (a > b ? -1 : 1));
    if (fallbackMatch.length) {
      lastCode = fallbackMatch[0];
    }
  }

  const nextNumber = lastCode
    ? (parseInt(lastCode.slice(prefix.length), 10) || 0) + 1
    : 1;
  const suffix = Number.isFinite(nextNumber) ? nextNumber.toString() : "1";
  return `${prefix}${suffix}`;
}

router.get("/options", async (req, res) => {
  try {
    let teacherRows = [];
    let cohortRows = [];

    try {
      teacherRows = await prisma.teachers.findMany({
        select: { teacher_id: true, full_name: true, email: true },
        orderBy: { full_name: "asc" },
      });
    } catch (error) {
      console.error("admin classes options teachers error:", error);
    }

    try {
      cohortRows = await prisma.cohorts.findMany({
        select: { code: true },
        orderBy: { year: "asc" },
      });
    } catch (error) {
      console.error("admin classes options cohorts error:", error);
    }

    let teachers = teacherRows.map((row) => ({
      id: row.teacher_id,
      name: row.full_name,
      email: row.email || null,
    }));

    if (!teachers.length) {
      const source = cloneFallback();
      const fallbackTeachers = source
        .map((item) => ({
          id: item.teacher_id || item.class_id,
          name: item.teacherName,
          email: item.teacherEmail || null,
        }))
        .filter((item) => item.name);
      const teacherMap = new Map();
      fallbackTeachers.forEach((teacher) => {
        if (!teacher.name) return;
        teacherMap.set(teacher.name, teacher);
      });
      teachers = Array.from(teacherMap.values());
    }

    let cohorts = Array.from(
      new Set((cohortRows || []).map((row) => row.code).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (!cohorts.length) {
      const source = cloneFallback();
      cohorts = Array.from(
        new Set(source.map((item) => item.cohort).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }

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
    if (!prisma?.classes?.findMany) {
      throw new Error("PRISMA_CLASSES_UNAVAILABLE");
    }

    // Lấy danh sách lớp
    const rows = await prisma.classes.findMany({
      orderBy: { created_at: "desc" },
      include: {
        teacher: {
          select: { teacher_id: true, full_name: true, email: true },
        },
      },
    });

    // Lấy số sinh viên cho từng lớp dựa trên cột students.classes (chuỗi danh sách mã lớp)
    const classIds = rows.map((row) => row.class_id);

    // Lấy tất cả sinh viên có tham gia ít nhất một lớp (classes != null)
    const studentRows = await prisma.students.findMany({
      where: { classes: { not: null } },
      select: { student_id: true, classes: true },
    });

    const studentCounts = {};
    classIds.forEach((id) => {
      studentCounts[id] = 0;
    });

    // Với mỗi sinh viên, tách danh sách lớp và cộng dồn vào từng mã lớp tương ứng
    studentRows.forEach((stu) => {
      const classList = splitClasses(stu.classes);
      classList.forEach((cid) => {
        if (studentCounts[cid] !== undefined) {
          studentCounts[cid] += 1;
        }
      });
    });

    const formatted = rows.map((row) => {
      const normalizedStatus = normalizeStatus(row.status);
      return formatClassRecord({
        ...row,
        status: normalizedStatus,
        studentCount: studentCounts[row.class_id] || 0,
      });
    });

    fallbackStore = formatted.map((item) => ({
      class_id: item.code,
      class_name: item.name,
      subject_code: item.subjectCode,
      subject_name: item.subjectName,
      cohort: item.cohort,
      major: item.major,
      teacher_id: item.teacherId,
      teacherName: item.teacherName || item.teacher || null,
      teacherEmail: item.teacherEmail || null,
      students: item.students || 0,
      status: item.status,
    }));

    const activeData = formatted.filter((item) => item.status === "Đang hoạt động");
    if (!activeData.length) {
      return res.json({ success: true, data: [], message: "Đang không có lớp học hoạt động" });
    }
    return res.json({ success: true, data: activeData });
  } catch (error) {
    console.error("admin classes list error:", error);
    if (error.message === "PRISMA_CLASSES_UNAVAILABLE") {
      console.warn("Prisma classes model unavailable, serving fallback data");
    }
    const fallbackData = cloneFallback().map((item) =>
      formatClassRecord({
        ...item,
        teacher: item.teacherName
          ? {
              teacher_id: item.teacher_id,
              full_name: item.teacherName,
              email: item.teacherEmail || null,
            }
          : null,
        studentCount: item.students || 0,
      })
    );

    const activeFallback = fallbackData.filter((item) => item.status === "Đang hoạt động");
    if (!activeFallback.length) {
      return res.json({ success: true, data: [], message: "Đang không có lớp học hoạt động" });
    }
    return res.json({ success: true, data: activeFallback, fallback: true });
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

    fallbackStore = fallbackStore
      .filter((item) => item.class_id !== formatted.code)
      .concat({
        class_id: formatted.code,
        class_name: formatted.name,
        subject_code: formatted.subjectCode,
        subject_name: formatted.subjectName,
        cohort: formatted.cohort,
        major: formatted.major,
        teacher_id: formatted.teacherId,
        teacherName: formatted.teacherName || formatted.teacher || null,
        teacherEmail: formatted.teacherEmail || null,
        students: formatted.students || 0,
        status: formatted.status,
      });

    return res.status(201).json({ success: true, data: formatted });
  } catch (error) {
    if (error.code === "INVALID_COHORT") {
      return res.status(400).json({ success: false, message: "Định dạng khóa không hợp lệ (ví dụ: K19, K2023)." });
    }
    console.error("admin classes create error:", error);

    try {
      const { name, subjectCode, cohort, teacherId, major, code, status } = req.body || {};
      const normalizedSubjectCode = typeof subjectCode === "string" ? subjectCode.trim().toUpperCase() : "";
      const subjectName = SUBJECT_MAP[normalizedSubjectCode] || (typeof name === "string" ? name.trim() : "");
      const classCode = typeof code === "string" && code.trim() ? code.trim().toUpperCase() : await generateClassCode(cohort || "");

      const fallbackRecord = {
        class_id: classCode,
        class_name: typeof name === "string" && name.trim() ? name.trim() : subjectName,
        subject_code: normalizedSubjectCode,
        subject_name: subjectName,
        cohort: typeof cohort === "string" ? cohort.trim().toUpperCase() : "",
        teacher_id: typeof teacherId === "string" && teacherId.trim() ? teacherId.trim() : null,
        teacherName: optionsTeacherName(teacherId),
        teacherEmail: null,
        major: typeof major === "string" && major.trim() ? major.trim() : null,
        status: normalizeStatus(status),
        students: 0,
      };

      if (!fallbackStore.some((item) => item.class_id === fallbackRecord.class_id)) {
        fallbackStore = [...fallbackStore, fallbackRecord];
      }

      const formatted = formatClassRecord({ ...fallbackRecord, studentCount: 0, teacher: null });
      return res.status(201).json({ success: true, data: formatted, fallback: true });
    } catch (fallbackError) {
      console.error("admin classes create fallback error:", fallbackError);
      return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
  }
});

router.put("/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const { name, subjectCode, cohort, teacherId, major, status, code: nextCodeRaw } = req.body || {};

    if (!prisma?.classes?.findUnique) {
      const targetIndex = fallbackStore.findIndex((item) => item.class_id === code);
      if (targetIndex === -1) {
        return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
      }

      const updates = { ...fallbackStore[targetIndex] };

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
        updates.teacher_id = teacherId && typeof teacherId === "string" && teacherId.trim() ? teacherId.trim() : null;
      }

      fallbackStore[targetIndex] = updates;
      const formatted = formatClassRecord({ ...updates, studentCount: fallbackStore[targetIndex].students || 0, teacher: null });
      return res.json({ success: true, data: formatted });
    }

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

    // Chuẩn hóa mã lớp mới (nếu người dùng nhập)
    const normalizedNextCode =
      typeof nextCodeRaw === "string" && nextCodeRaw.trim()
        ? normalizeClassCode(nextCodeRaw)
        : null;

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

    // Nếu không đổi mã lớp, giữ logic cập nhật đơn giản như cũ
    if (!normalizedNextCode || normalizedNextCode === existing.class_id) {
      const updated = await prisma.classes.update({
        where: { class_id: code },
        data: updates,
        include: {
          teacher: { select: { teacher_id: true, full_name: true, email: true } },
        },
      });

      // Cập nhật timetable.subject_name cho mọi dòng chứa lớp này
      try {
        await prisma.timetable.updateMany({
          where: { classes: { contains: updated.class_id } },
          data: { subject_name: updated.subject_name },
        });
      } catch (e) {
        console.error("update timetable subject_name error (no rename):", e);
      }

      const formatted = formatClassRecord({ ...updated, studentCount: 0 });
      return res.json({ success: true, data: formatted });
    }

    // Đổi mã lớp: tạo lớp mới với mã mới, cập nhật các bảng liên quan, xóa lớp cũ
    const newCode = normalizedNextCode;

    // Không cho trùng mã lớp
    const duplicate = await prisma.classes.findUnique({ where: { class_id: newCode } });
    if (duplicate) {
      return res.status(409).json({ success: false, message: "Mã lớp mới đã tồn tại" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Tạo bản ghi lớp mới với mã mới và các field đã chỉnh sửa
      const created = await tx.classes.create({
        data: {
          class_id: newCode,
          class_name: updates.class_name ?? existing.class_name,
          subject_code: updates.subject_code ?? existing.subject_code,
          subject_name: updates.subject_name ?? existing.subject_name,
          cohort: updates.cohort ?? existing.cohort,
          major: Object.prototype.hasOwnProperty.call(updates, "major") ? updates.major : existing.major,
          teacher_id: Object.prototype.hasOwnProperty.call(updates, "teacher_id") ? updates.teacher_id : existing.teacher_id,
          status: updates.status ?? existing.status,
          room: existing.room,
          schedule: existing.schedule,
          semester: existing.semester,
          school_year: existing.school_year,
          description: updates.description ?? existing.description,
        },
        include: {
          teacher: { select: { teacher_id: true, full_name: true, email: true } },
        },
      });

      // Cập nhật các phiên điểm danh sang mã lớp mới
      await tx.attendanceSession.updateMany({
        where: { classId: existing.class_id },
        data: { classId: newCode },
      });

      // Cập nhật students.classes: thay mã lớp cũ bằng mã mới
      const affectedStudents = await tx.students.findMany({
        where: { classes: { contains: existing.class_id } },
        select: { student_id: true, classes: true },
      });

      for (const stu of affectedStudents) {
        const list = splitClasses(stu.classes).map((cid) => (cid === existing.class_id ? newCode : cid));
        const merged = joinClasses(list).join(",");
        await tx.students.update({
          where: { student_id: stu.student_id },
          data: { classes: merged },
        });
      }

      // Cập nhật timetable.classes và subject_name nếu có dùng mã lớp dạng chuỗi
      const affectedTimetables = await tx.timetable.findMany({
        where: { classes: { contains: existing.class_id } },
        select: { id: true, classes: true },
      });

      for (const row of affectedTimetables) {
        const list = splitClasses(row.classes).map((cid) => (cid === existing.class_id ? newCode : cid));
        const merged = joinClasses(list).join(",");
        await tx.timetable.update({
          where: { id: row.id },
          data: {
            classes: merged,
            subject_name: created.subject_name,
          },
        });
      }

      // Xóa lớp cũ sau khi đã migrate dữ liệu
      await tx.classes.delete({ where: { class_id: existing.class_id } });

      return created;
    });

    const formatted = formatClassRecord({ ...result, studentCount: 0 });
    return res.json({ success: true, data: formatted });
  } catch (error) {
    console.error("admin classes update error:", error);
    return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
});

function optionsTeacherName(teacherId) {
  if (!teacherId) return null;
  const record = fallbackStore.find((item) => item.teacher_id === teacherId || item.class_id === teacherId);
  return record ? record.teacherName || null : null;
}

router.get("/:code/students", async (req, res) => {
  try {
    await prisma.$ready;
    const code = normalizeClassCode(req.params.code);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    if (!code) {
      return res.status(400).json({ success: false, message: "Thiếu mã lớp" });
    }

    const cls = await prisma.classes.findUnique({ where: { class_id: code } });
    if (!cls) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    }

    const whereClause = search
      ? {
          OR: [
            { student_id: { contains: search } },
            { full_name: { contains: search } },
          ],
        }
      : {};

    const rows = await prisma.students.findMany({
      where: {
        ...whereClause,
        classes: { contains: code },
      },
      select: {
        student_id: true,
        full_name: true,
        email: true,
        status: true,
        course: true,
        classes: true,
      },
      orderBy: { student_id: "asc" },
      take: 200,
    });

    const members = rows
      .filter((row) => splitClasses(row.classes).includes(code))
      .map(mapStudentRecord);

    return res.json({ success: true, data: { members, total: members.length } });
  } catch (error) {
    console.error("admin classes list students error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách sinh viên" });
  }
});

router.get("/:code/students/search", async (req, res) => {
  try {
    await prisma.$ready;
    const code = normalizeClassCode(req.params.code);
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";

    if (!code) {
      return res.status(400).json({ success: false, message: "Thiếu mã lớp" });
    }

    const cls = await prisma.classes.findUnique({ where: { class_id: code }, select: { class_id: true } });
    if (!cls) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    }

    const rows = await prisma.students.findMany({
      where: {
        ...(query
          ? {
              OR: [
                { student_id: { contains: query } },
                { full_name: { contains: query } },
              ],
            }
          : {}),
      },
      select: {
        student_id: true,
        full_name: true,
        email: true,
        status: true,
        course: true,
        classes: true,
      },
      orderBy: { student_id: "asc" },
      take: 50,
    });

    const candidates = rows
      .filter((row) => !splitClasses(row.classes).includes(code))
      .map(mapStudentRecord);

    return res.json({ success: true, data: { candidates } });
  } catch (error) {
    console.error("admin classes search students error:", error);
    return res.status(500).json({ success: false, message: "Không thể tìm sinh viên" });
  }
});

router.post("/:code/students", async (req, res) => {
  try {
    await prisma.$ready;
    const code = normalizeClassCode(req.params.code);
    const { studentIds } = req.body || {};
    if (!code || !Array.isArray(studentIds) || !studentIds.length) {
      return res.status(400).json({ success: false, message: "Thiếu mã lớp hoặc danh sách sinh viên" });
    }
    const cls = await prisma.classes.findUnique({ where: { class_id: code } });
    if (!cls) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    }
    let added = 0;
    for (const studentId of studentIds) {
      const student = await prisma.students.findUnique({
        where: { student_id: studentId.trim() },
        select: {
          student_id: true,
          full_name: true,
          email: true,
          status: true,
          course: true,
          classes: true,
        },
      });
      if (!student) continue;
      const currentClasses = splitClasses(student.classes);
      if (!currentClasses.includes(code)) {
        currentClasses.push(code);
        const updatedClasses = joinClasses(currentClasses).join(",");
        await prisma.students.update({
          where: { student_id: student.student_id },
          data: { classes: updatedClasses },
        });
        added++;
      }
    }
    const members = await prisma.students.findMany({
      where: { classes: { contains: code } },
      select: {
        student_id: true,
        full_name: true,
        email: true,
        status: true,
        course: true,
        classes: true,
      },
    });
    const filteredMembers = members.filter((row) => splitClasses(row.classes).includes(code)).map(mapStudentRecord);
    return res.status(201).json({
      success: true,
      data: {
        added,
        total: filteredMembers.length,
      },
    });
  } catch (error) {
    console.error("admin classes add student error:", error);
    return res.status(500).json({ success: false, message: "Không thể thêm sinh viên" });
  }
});

router.put("/bulk/status", async (req, res) => {
  try {
    const { classIds, status } = req.body || {};
    if (!Array.isArray(classIds) || !classIds.length) {
      return res.status(400).json({ success: false, message: "Danh sách lớp cần cập nhật trống" });
    }
    const normalizedStatus = normalizeStatus(status);

    if (prisma?.classes?.updateMany) {
      await prisma.classes.updateMany({
        where: { class_id: { in: classIds } },
        data: { status: normalizedStatus },
      });
      const rows = await prisma.classes.findMany({
        where: { class_id: { in: classIds } },
        include: {
          teacher: { select: { teacher_id: true, full_name: true, email: true } },
        },
      });
      const formatted = rows.map((row) => formatClassRecord({ ...row, studentCount: row.studentCount || 0 }));
      return res.json({ success: true, data: formatted });
    }

    const idSet = new Set(classIds.map(String));
    fallbackStore = fallbackStore.map((item) =>
      idSet.has(item.class_id)
        ? { ...item, status: normalizedStatus }
        : item
    );

    const updated = fallbackStore
      .filter((item) => idSet.has(item.class_id))
      .map((item) =>
        formatClassRecord({
          ...item,
          teacher: item.teacherName
            ? {
                teacher_id: item.teacher_id,
                full_name: item.teacherName,
                email: item.teacherEmail || null,
              }
            : null,
          studentCount: item.students || 0,
        })
      );

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("admin classes bulk-status error:", error);
    return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
});

router.delete("/bulk", async (req, res) => {
  try {
    const { classIds } = req.body || {};
    if (!Array.isArray(classIds) || !classIds.length) {
      return res.status(400).json({ success: false, message: "Danh sách lớp cần xóa trống" });
    }

    if (prisma?.classes?.deleteMany) {
      const result = await prisma.classes.deleteMany({ where: { class_id: { in: classIds } } });
      return res.json({ success: true, deleted: result.count });
    }

    const idSet = new Set(classIds.map(String));
    const before = fallbackStore.length;
    fallbackStore = fallbackStore.filter((item) => !idSet.has(item.class_id));
    const deleted = before - fallbackStore.length;
    return res.json({ success: true, deleted });
  } catch (error) {
    console.error("admin classes bulk-delete error:", error);
    return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
});

module.exports = router;
