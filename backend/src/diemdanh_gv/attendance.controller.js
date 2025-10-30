const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

const {
  getClassesByTeacher,
  getClassById,
  getClassSlotsByDay,
  findLatestSession,
  createSession,
  updateSession,
  getSessionById,
  getSessionWithClass,
  getClassStudents,
  getAttendanceRecords,
  saveManualAttendance,
  countClassStudents,
  getClassHistory,
} = require("./attendance.model");
const { jsonResponse } = require("../utils/json");

const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const SESSION_DURATION_SECONDS = 60;
const MAX_RESETS = 3;

const normalizeClassId = (value) => String(value ?? "").trim().toUpperCase();

const generateCode = () => {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * CODE_CHARSET.length);
    code += CODE_CHARSET[index];
  }
  return code;
};

const toDateOnly = (input) => {
  const fallback = dayjs().startOf("day");
  if (!input) return fallback;
  const parsed = dayjs(input);
  if (!parsed.isValid()) return fallback;
  return parsed.startOf("day");
};

const DAY_MAP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getDayKeyFromDate = (date) => DAY_MAP[dayjs(date).day()] ?? "Mon";

const serializeSession = (session) => ({
  id: session.id,
  classId: session.class_id,
  slotId: session.slot_id,
  day: dayjs(session.day).format("YYYY-MM-DD"),
  code: session.code,
  type: session.type,
  status: session.status,
  attempts: session.attempts,
  attemptsRemaining: Math.max(0, MAX_RESETS - session.attempts),
  expiresAt: session.expires_at ? dayjs(session.expires_at).toISOString() : null,
  createdAt: dayjs(session.created_at).toISOString(),
  updatedAt: dayjs(session.updated_at).toISOString(),
});

const ensureTeacherOwnsClass = async (teacherId, classId) => {
  const record = await getClassById(classId);
  if (!record) {
    const error = new Error("CLASS_NOT_FOUND");
    error.status = 404;
    throw error;
  }
  if (record.teacher_id && normalizeClassId(record.teacher_id) !== normalizeClassId(teacherId)) {
    const error = new Error("FORBIDDEN");
    error.status = 403;
    throw error;
  }
  return record;
};

const listTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) {
      return res.status(401).json({ success: false, message: "Không xác định được giảng viên" });
    }
    console.log("[Attendance] listTeacherClasses user", teacherId);
    const rows = await getClassesByTeacher(teacherId);
    console.log("[Attendance] classes found", rows?.length);
    const data = rows.map((row) => ({
      id: row.class_id,
      code: row.class_id,
      name: row.class_name,
      subjectName: row.subject_name,
      subjectCode: row.subject_code,
      semester: row.semester,
      schoolYear: row.school_year,
      status: row.status,
      studentCount: Number(row.student_count || 0),
    }));
    return jsonResponse(res, { success: true, data });
  } catch (error) {
    console.error("attendance list classes error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách lớp", detail: error?.message });
  }
};

const listClassSlots = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    const { classId } = req.params;
    const date = toDateOnly(req.query?.date);
    console.log("[Attendance] listClassSlots", { classId, date: date.format("YYYY-MM-DD") });
    await ensureTeacherOwnsClass(teacherId, classId);
    const dayKey = getDayKeyFromDate(date);
    console.log("[Attendance] dayKey", dayKey);
    const slots = await getClassSlotsByDay(classId, dayKey);
    console.log("[Attendance] slots length", slots.length);
    const data = slots.map((slot) => ({
      timetableId: slot.id,
      slotId: slot.slot_id,
      room: slot.room,
      weekKey: slot.week_key,
      subject: slot.subject_name,
      teacherName: slot.teacher_name,
    }));
    return jsonResponse(res, { success: true, data });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    if (error.status === 403) return res.status(403).json({ success: false, message: "Bạn không có quyền với lớp này" });
    console.error("attendance list slots error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải slot lớp" });
  }
};

const createOrGetSession = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    const { classId, slotId, type, date } = req.body || {};
    if (!classId || !slotId || !type) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin lớp, slot hoặc hình thức" });
    }
    const slot = Number(slotId);
    if (!Number.isInteger(slot) || slot <= 0) {
      return res.status(400).json({ success: false, message: "Slot không hợp lệ" });
    }
    if (!["qr", "code", "manual"].includes(type)) {
      return res.status(400).json({ success: false, message: "Hình thức không hợp lệ" });
    }
    await ensureTeacherOwnsClass(teacherId, classId);
    const targetDay = toDateOnly(date);
    const dayKey = targetDay.format("YYYY-MM-DD");
    const existing = await findLatestSession({ classId, slotId: slot, day: targetDay.toDate() });
    const now = dayjs().utc();

    if (existing && existing.status !== "closed") {
      if (existing.expires_at && dayjs(existing.expires_at).isBefore(now) && existing.status === "active") {
        await updateSession(existing.id, { status: "expired" });
        existing.status = "expired";
      }
      if (existing.status === "active" && existing.type === type) {
        return jsonResponse(res, { success: true, data: serializeSession(existing), reused: true });
      }
    }

    const code = generateCode();
    const expiresAt = ["qr", "code"].includes(type)
      ? now.add(SESSION_DURATION_SECONDS, "second").toDate()
      : now.toDate();

    const session = await createSession({
      class_id: normalizeClassId(classId),
      slot_id: slot,
      day: targetDay.toDate(),
      code,
      type,
      status: "active",
      attempts: 0,
      expires_at: expiresAt,
    });

    return jsonResponse(res, { success: true, data: serializeSession(session) }, 201);
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    if (error.status === 403) return res.status(403).json({ success: false, message: "Bạn không có quyền với lớp này" });
    console.error("attendance create session error:", error);
    return res.status(500).json({ success: false, message: "Không thể tạo buổi điểm danh" });
  }
};

const resetSessionCode = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Thiếu session id" });

    const session = await getSessionWithClass(id);
    if (!session) return res.status(404).json({ success: false, message: "Không tìm thấy buổi điểm danh" });
    await ensureTeacherOwnsClass(teacherId, session.session_class.class_id);
    if (session.type === "manual") {
      return res.status(400).json({ success: false, message: "Hình thức thủ công không hỗ trợ reset mã" });
    }
    if (session.attempts >= MAX_RESETS) {
      await updateSession(session.id, { status: "closed" });
      return res.status(409).json({ success: false, message: "Đã hết lượt reset mã" });
    }

    const now = dayjs().utc();
    const updated = await updateSession(session.id, {
      code: generateCode(),
      expires_at: now.add(SESSION_DURATION_SECONDS, "second").toDate(),
      attempts: session.attempts + 1,
      status: "active",
    });

    return jsonResponse(res, { success: true, data: serializeSession(updated) });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    if (error.status === 403) return res.status(403).json({ success: false, message: "Bạn không có quyền với lớp này" });
    console.error("attendance reset session error:", error);
    return res.status(500).json({ success: false, message: "Không thể reset mã" });
  }
};

const getSessionDetail = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Thiếu session id" });

    const session = await getSessionWithClass(id);
    if (!session) return res.status(404).json({ success: false, message: "Không tìm thấy buổi điểm danh" });
    await ensureTeacherOwnsClass(teacherId, session.session_class.class_id);
    const totalStudents = await countClassStudents(session.session_class.class_id);
    return jsonResponse(res, {
      success: true,
      data: {
        ...serializeSession(session),
        className: session.session_class.class_name,
        subjectName: session.session_class.subject_name,
        totalStudents,
      },
    });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    if (error.status === 403) return res.status(403).json({ success: false, message: "Bạn không có quyền với lớp này" });
    console.error("attendance get session detail error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải thông tin buổi điểm danh" });
  }
};

const getSessionStudents = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Thiếu session id" });
    const session = await getSessionWithClass(id);
    if (!session) return res.status(404).json({ success: false, message: "Không tìm thấy buổi điểm danh" });
    await ensureTeacherOwnsClass(teacherId, session.session_class.class_id);

    const [students, records] = await Promise.all([
      getClassStudents(session.session_class.class_id),
      getAttendanceRecords(id),
    ]);
    const recordMap = new Map(records.map((item) => [item.student_id, item]));

    const data = students.map((student) => {
      const record = recordMap.get(student.student_id);
      return {
        studentId: student.student_id,
        fullName: student.full_name,
        email: student.email,
        course: student.course,
        status: record?.status || "absent",
        markedAt: record?.marked_at ? dayjs(record.marked_at).toISOString() : null,
        note: record?.note || null,
      };
    });

    const present = data.filter((item) => item.status === "present").length;
    const excused = data.filter((item) => item.status === "excused").length;
    return jsonResponse(res, {
      success: true,
      data,
      summary: {
        total: data.length,
        present,
        excused,
        absent: data.length - present - excused,
      },
    });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    if (error.status === 403) return res.status(403).json({ success: false, message: "Bạn không có quyền với lớp này" });
    console.error("attendance session students error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách điểm danh" });
  }
};

const updateManualAttendance = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    const id = Number(req.params.id);
    const { students } = req.body || {};
    if (!id) return res.status(400).json({ success: false, message: "Thiếu session id" });
    if (!Array.isArray(students) || !students.length) {
      return res.status(400).json({ success: false, message: "Danh sách sinh viên trống" });
    }

    const session = await getSessionWithClass(id);
    if (!session) return res.status(404).json({ success: false, message: "Không tìm thấy buổi điểm danh" });
    await ensureTeacherOwnsClass(teacherId, session.session_class.class_id);
    if (session.type !== "manual") {
      return res.status(400).json({ success: false, message: "Chỉ hỗ trợ cập nhật cho hình thức thủ công" });
    }

    const entries = students.map((item) => {
      const statusValue = (item.status || "").toLowerCase();
      let status = "absent";
      if (statusValue === "present" || item.present === true) status = "present";
      else if (statusValue === "excused") status = "excused";
      return {
        studentId: item.studentId,
        status,
        markedAt: item.markedAt ? new Date(item.markedAt) : undefined,
        note: item.note ?? null,
      };
    });

    await saveManualAttendance(id, entries);
    const [updatedStudents, records] = await Promise.all([
      getClassStudents(session.session_class.class_id),
      getAttendanceRecords(id),
    ]);
    const recordMap = new Map(records.map((item) => [item.student_id, item]));

    const data = updatedStudents.map((student) => {
      const record = recordMap.get(student.student_id);
      return {
        studentId: student.student_id,
        fullName: student.full_name,
        email: student.email,
        course: student.course,
        status: record?.status || "absent",
        markedAt: record?.marked_at ? dayjs(record.marked_at).toISOString() : null,
        note: record?.note || null,
      };
    });

    return jsonResponse(res, { success: true, data });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    if (error.status === 403) return res.status(403).json({ success: false, message: "Bạn không có quyền với lớp này" });
    console.error("attendance manual update error:", error);
    return res.status(500).json({ success: false, message: "Không thể cập nhật điểm danh" });
  }
};

const getClassHistoryHandler = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    const { classId } = req.params;
    const slot = req.query?.slot ? Number(req.query.slot) : undefined;
    await ensureTeacherOwnsClass(teacherId, classId);
    const rows = await getClassHistory(classId, slot, 50);
    const data = rows.map((row) => {
      const total = row.records?.length || 0;
      const present = row.records?.filter((r) => r.status === "present").length || 0;
      return {
        id: row.id,
        day: dayjs(row.day).format("YYYY-MM-DD"),
        slotId: row.slot_id,
        type: row.type,
        status: row.status,
        code: row.code,
        present,
        total,
        ratio: total ? Math.round((present / total) * 100) : 0,
        createdAt: dayjs(row.created_at).toISOString(),
      };
    });
    return res.json({ success: true, data });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    if (error.status === 403) return res.status(403).json({ success: false, message: "Bạn không có quyền với lớp này" });
    console.error("attendance class history error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải lịch sử điểm danh" });
  }
};

module.exports = {
  listTeacherClasses,
  listClassSlots,
  createOrGetSession,
  resetSessionCode,
  getSessionDetail,
  getSessionStudents,
  updateManualAttendance,
  getClassHistory: getClassHistoryHandler,
};
