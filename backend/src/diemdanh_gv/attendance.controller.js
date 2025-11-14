const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

const {
  getClassesByTeacher,
  getClassesByTeacherAndDay,
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
  finalizeAttendanceSession,
  listSessionsByDate,
  getSessionWithRecords,
  updateAttendanceRecordById,
  deleteSessionById,
  getAttendanceRecordById,
} = require("./attendance.model");
const { jsonResponse } = require("../utils/json");

const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const SESSION_DURATION_SECONDS = 60;
const MAX_ATTEMPTS = 3; // tổng số lần sử dụng mã: lần tạo đầu + 2 lần reset

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
  // Luôn chuẩn hóa về mốc 00:00 UTC của ngày tương ứng để tránh lệch ngày khi lưu @db.Date
  const buildUtcDay = (year, month, day) => dayjs.utc(new Date(Date.UTC(year, month - 1, day)));
  const today = dayjs();
  const fallback = buildUtcDay(today.year(), today.month() + 1, today.date());
  if (!input) return fallback;
  const str = String(input).trim();
  // Ưu tiên parse định dạng yyyy-MM-dd (frontend gửi)
  const simple = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (simple) {
    const [, y, m, d] = simple;
    return buildUtcDay(Number(y), Number(m), Number(d));
  }
  // Fallback cho các định dạng khác, nhưng vẫn chuyển sang UTC date-only
  const parsed = dayjs(str);
  if (!parsed.isValid()) return fallback;
  return buildUtcDay(parsed.year(), parsed.month() + 1, parsed.date());
};

const DAY_MAP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getDayKeyFromDate = (date) => DAY_MAP[dayjs(date).day()] ?? "Mon";

const VALID_STATUSES = new Set(["present", "absent", "excused"]);

const typeIncludes = (typeStr, t) => {
  if (!typeStr) return false;
  return String(typeStr)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(String(t));
};

const mapRecordsWithStudents = (records = [], students = []) => {
  const studentMap = new Map(students.map((item) => [item.student_id, item]));
  return records.map((record) => {
    const student = studentMap.get(record.studentId);
    const recordedAt = record.recordedAt ? dayjs(record.recordedAt).toISOString() : null;
    return {
      id: record.id,
      studentId: record.studentId,
      fullName: student?.full_name ?? null,
      email: student?.email ?? null,
      course: student?.course ?? null,
      status: record.status,
      recordedAt,
      markedAt: recordedAt,
      modifiedAt: record.modifiedAt ? dayjs(record.modifiedAt).toISOString() : null,
      modifiedBy: record.modifiedBy ?? null,
      note: record.note ?? null,
    };
  });
};

const summarizeRecords = (records = []) => {
  let present = 0;
  let excused = 0;
  for (const record of records) {
    if (record.status === "present") present += 1;
    else if (record.status === "excused") excused += 1;
  }
  const total = records.length;
  const absent = Math.max(0, total - present - excused);
  return { total, present, excused, absent };
};

const serializeSession = (session) => {
  const classId = session.classId ?? session.class_id;
  const slot = session.slot ?? session.slot_id;
  const date = session.date ?? session.day;
  const expiresAt = session.expiresAt ?? session.expires_at;
  const createdAt = session.createdAt ?? session.created_at;
  const updatedAt = session.updatedAt ?? session.updated_at;
  const endedAt = session.endedAt ?? session.ended_at;
  const totalStudents = session.totalStudents ?? session.total_students;
  const createdBy = session.createdBy ?? session.created_by;

  return {
    id: session.id,
    classId: classId ? normalizeClassId(classId) : null,
    slotId: slot ?? null,
    day: date ? dayjs(date).format("YYYY-MM-DD") : null,
    code: session.code || null,
    type: session.type,
    status: session.status,
    attempts: session.attempts ?? 0,
    maxResets: MAX_ATTEMPTS,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - (session.attempts ?? 0)),
    expiresAt: expiresAt ? dayjs(expiresAt).toISOString() : null,
    createdAt: createdAt ? dayjs(createdAt).toISOString() : null,
    updatedAt: updatedAt ? dayjs(updatedAt).toISOString() : null,
    endedAt: endedAt ? dayjs(endedAt).toISOString() : null,
    totalStudents: totalStudents ?? null,
    createdBy: createdBy ?? null,
  };
};

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

const extractTeacherId = (req) => {
  const user = req.user ?? {};
  return (
    user.userId
    || user.user_id
    || user.user_code
    || user.userCode
    || user.teacherId
    || null
  );
};

const listTeacherClasses = async (req, res) => {
  try {
    const teacherId = extractTeacherId(req);
    if (!teacherId) {
      return res.status(401).json({ success: false, message: "Không xác định được giảng viên" });
    }
    const hasDateFilter = Boolean(req.query?.date);
    const targetDay = hasDateFilter ? toDateOnly(req.query.date) : null;
    console.log("[Attendance] listTeacherClasses user", teacherId, req.user, {
      date: hasDateFilter ? targetDay.format("YYYY-MM-DD") : null,
    });

    let rows;
    if (hasDateFilter) {
      const dayKey = getDayKeyFromDate(targetDay.toDate());
      const dateStr = targetDay.format("YYYY-MM-DD");
      rows = await getClassesByTeacherAndDay(teacherId, dayKey, dateStr);
    } else {
      rows = await getClassesByTeacher(teacherId);
    }

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
    const teacherId = extractTeacherId(req);
    const { classId } = req.params;
    const targetDay = toDateOnly(req.query?.date);
    console.log("[Attendance] listClassSlots", { classId, date: targetDay.format("YYYY-MM-DD") });
    await ensureTeacherOwnsClass(teacherId, classId);
    const dayKey = getDayKeyFromDate(targetDay.toDate());
    console.log("[Attendance] dayKey", dayKey);
    const dateStr = targetDay.format("YYYY-MM-DD");
    const slots = await getClassSlotsByDay(classId, dayKey, dateStr);

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
    const teacherId = extractTeacherId(req);
    const { classId, slotId, type, date } = req.body || {};
    console.log("[Attendance] createOrGetSession input", { classId, slotId, type, date });
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
    console.log("[Attendance] createOrGetSession normalized date", {
      raw: date,
      targetDayISO: targetDay.toISOString(),
      targetDayFormatted: targetDay.format("YYYY-MM-DD"),
    });
    const existing = await findLatestSession({ classId, slotId: slot, day: targetDay.toDate() });
    const now = dayjs().utc();

    if (existing) {
      if (existing.expiresAt && dayjs(existing.expiresAt).isBefore(now) && existing.status === "active") {
        await updateSession(existing.id, { status: "expired" });
        existing.status = "expired";
      }
      if (["ended", "closed"].includes(existing.status)) {
        // yêu cầu: slot chỉ điểm danh 1 lần, không cho mở lại kể cả thủ công
        return res.status(409).json({ success: false, message: "Đã hoàn thành phiên điểm danh" });
      }
      // If existing active session already supports requested mode, reuse it.
      if (existing.status === "active" && typeIncludes(existing.type, type)) {
        return jsonResponse(res, { success: true, data: serializeSession(existing), reused: true });
      }

      const totalStudents = await countClassStudents(classId);
      const code = ["qr", "code"].includes(type) ? generateCode() : null;
      const expiresAt = ["qr", "code"].includes(type)
        ? now.add(SESSION_DURATION_SECONDS, "second").toDate()
        : null;
      const attempts = type === "manual" ? 0 : 1;

      // Merge existing type(s) with requested type (avoid duplicates)
      const existingTypes = String(existing.type || "").split(',').map((s) => s.trim()).filter(Boolean);
      const merged = Array.from(new Set([...existingTypes, type]));
      const newType = merged.join(',');
      const updated = await updateSession(existing.id, {
        type: newType,
        status: "active",
        code,
        expiresAt,
        attempts,
        totalStudents,
        createdBy: teacherId,
      });

      return jsonResponse(res, { success: true, data: serializeSession(updated), reused: true });
    }

    const code = ["qr", "code"].includes(type) ? generateCode() : null;
    const expiresAt = ["qr", "code"].includes(type)
      ? now.add(SESSION_DURATION_SECONDS, "second").toDate()
      : null;

    const initialAttempts = type === "manual" ? 0 : 1;
    const totalStudents = await countClassStudents(classId);

    console.log("[Attendance] createOrGetSession creating session", {
      classId: normalizeClassId(classId),
      slot,
      storedDate: targetDay.toDate(),
      storedDateISO: targetDay.toDate().toISOString(),
      dayFormatted: targetDay.format("YYYY-MM-DD"),
    });

    const session = await createSession({
      classId: normalizeClassId(classId),
      slot,
      date: targetDay.toDate(),
      code,
      type,
      status: "active",
      attempts: initialAttempts,
      expiresAt,
      createdBy: teacherId,
      totalStudents,
    });

    return jsonResponse(res, { success: true, data: serializeSession(session) }, 201);
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    if (error.status === 403) return res.status(403).json({ success: false, message: "Bạn không có quyền với lớp này" });
    console.error("attendance create session error:", error);
    return res.status(500).json({ success: false, message: "Không thể tạo buổi điểm danh" });
  }
};

const endAttendanceSession = async (req, res) => {
  try {
    const teacherId = extractTeacherId(req);
    const { classId, slot, method, code } = req.body || {};
    if (!teacherId) {
      return res.status(401).json({ success: false, message: "Không xác định được giảng viên" });
    }
    if (!classId || slot == null || !method) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin lớp, slot hoặc phương thức" });
    }
    const slotNumber = Number(slot);
    if (!Number.isInteger(slotNumber) || slotNumber <= 0) {
      return res.status(400).json({ success: false, message: "Slot không hợp lệ" });
    }
    if (!["qr", "code", "manual"].includes(String(method))) {
      return res.status(400).json({ success: false, message: "Phương thức không hợp lệ" });
    }

    await ensureTeacherOwnsClass(teacherId, classId);

    // Dùng ngày hiện tại nhưng chuẩn hóa về UTC date-only để đồng bộ với createOrGetSession
    const nowLocal = dayjs();
    const targetDayJs = dayjs.utc(new Date(Date.UTC(nowLocal.year(), nowLocal.month(), nowLocal.date())));
    const targetDay = targetDayJs.toDate();
    console.log("[Attendance] endAttendanceSession targetDay", {
      classId,
      slot: slotNumber,
      method,
      targetDayISO: targetDayJs.toISOString(),
      targetDayFormatted: targetDayJs.format("YYYY-MM-DD"),
    });
    const result = await finalizeAttendanceSession({
      classId,
      slot: slotNumber,
      date: targetDay,
      type: String(method),
      code,
      createdBy: teacherId,
    });

    const records = mapRecordsWithStudents(result.records, result.students);
    const summary = summarizeRecords(records);

    return jsonResponse(
      res,
      {
        success: true,
        data: {
          session: serializeSession(result.session),
          records,
          summary,
        },
      },
      201
    );
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    if (error.status === 403) return res.status(403).json({ success: false, message: "Bạn không có quyền với lớp này" });
    if (error.status === 409) return res.status(409).json({ success: false, message: "Buổi điểm danh hôm nay đã được lưu" });
    if (error.status === 400) return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
    console.error("attendance end session error:", error);
    return res.status(500).json({ success: false, message: "Không thể lưu buổi điểm danh" });
  }
};

const listSessionsByDateHandler = async (req, res) => {
  try {
    const teacherId = extractTeacherId(req);
    const classId = req.query?.classId;
    if (!classId) {
      return res.status(400).json({ success: false, message: "Thiếu classId" });
    }
    await ensureTeacherOwnsClass(teacherId, classId);

    const targetDay = toDateOnly(req.query?.date);
    const sessions = await listSessionsByDate(classId, targetDay.toDate());
    const data = sessions.map((item) => {
      const serialized = serializeSession(item);
      const rawRecords = item.records || [];
      let present = 0;
      let excused = 0;
      for (const r of rawRecords) {
        if (r.status === "present") present += 1;
        else if (r.status === "excused") excused += 1;
      }
      const totalStudents = serialized.totalStudents ?? rawRecords.length;
      const total = Math.max(totalStudents, present + excused);
      const absent = Math.max(0, total - present - excused);
      const summary = { total, present, excused, absent };
      return {
        ...serialized,
        summary,
      };
    });

    return jsonResponse(res, { success: true, data });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    if (error.status === 403) return res.status(403).json({ success: false, message: "Bạn không có quyền với lớp này" });
    console.error("attendance list sessions error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách buổi điểm danh" });
  }
};

const getSessionWithRecordsHandler = async (req, res) => {
  try {
    const teacherId = extractTeacherId(req);
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "Thiếu session id" });

    const session = await getSessionWithRecords(id);
    if (!session) return res.status(404).json({ success: false, message: "Không tìm thấy buổi điểm danh" });
    await ensureTeacherOwnsClass(teacherId, session.session_class.class_id);

    const [students, rawRecords] = await Promise.all([
      getClassStudents(session.session_class.class_id),
      getAttendanceRecords(id),
    ]);

    const recordMap = new Map((rawRecords || []).map((item) => [item.studentId, item]));
    const records = (students || []).map((student) => {
      const record = recordMap.get(student.student_id);
      return {
        id: record?.id ?? null,
        studentId: student.student_id,
        fullName: student.full_name,
        email: student.email,
        course: student.course,
        status: record?.status || "absent",
        recordedAt: record?.recordedAt || null,
        markedAt: record?.recordedAt ? dayjs(record.recordedAt).toISOString() : null,
        modifiedAt: record?.modifiedAt ? dayjs(record.modifiedAt).toISOString() : null,
        modifiedBy: record?.modifiedBy || null,
        note: record?.note || null,
      };
    });

    const summary = summarizeRecords(records);
    const totalStudents = session.totalStudents ?? students.length;

    return jsonResponse(res, {
      success: true,
      data: {
        session: {
          ...serializeSession(session),
          className: session.session_class.class_name,
          subjectName: session.session_class.subject_name,
          totalStudents,
        },
        records,
        summary,
      },
    });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: "Không tìm thấy buổi điểm danh" });
    if (error.status === 403) return res.status(403).json({ success: false, message: "Bạn không có quyền với lớp này" });
    console.error("attendance session detail error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải thông tin buổi điểm danh" });
  }
};

const patchAttendanceRecord = async (req, res) => {
  try {
    const teacherId = extractTeacherId(req);
    const { id, recordId } = req.params;
    const { status, note, markedAt } = req.body || {};
    if (!id || !recordId) {
      return res.status(400).json({ success: false, message: "Thiếu session id hoặc record id" });
    }

    const session = await getSessionWithClass(id);
    if (!session) return res.status(404).json({ success: false, message: "Không tìm thấy buổi điểm danh" });
    await ensureTeacherOwnsClass(teacherId, session.session_class.class_id);

    const record = await getAttendanceRecordById(recordId);
    if (!record || record.sessionId !== id) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi điểm danh" });
    }

    const payload = {};
    const now = new Date();
    if (status !== undefined) {
      const normalized = String(status).toLowerCase();
      if (!VALID_STATUSES.has(normalized)) {
        return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
      }
      payload.status = normalized;
      const parsedMarkedAt = markedAt ? dayjs(markedAt) : null;
      if (parsedMarkedAt && parsedMarkedAt.isValid()) {
        payload.recordedAt = parsedMarkedAt.toDate();
      } else if (normalized === "present") {
        payload.recordedAt = now;
      } else {
        payload.recordedAt = null;
      }
    }

    if (note !== undefined) {
      payload.note = note ?? null;
    }

    if (!Object.keys(payload).length) {
      return res.status(400).json({ success: false, message: "Không có dữ liệu cần cập nhật" });
    }

    payload.modifiedAt = now;
    payload.modifiedBy = teacherId;

    await updateAttendanceRecordById(recordId, payload);

    const [records, students] = await Promise.all([
      getAttendanceRecords(id),
      getClassStudents(session.session_class.class_id),
    ]);
    const mapped = mapRecordsWithStudents(records, students);
    const summary = summarizeRecords(mapped);
    const updatedRecord = mapped.find((item) => item.id === recordId) ?? null;

    return jsonResponse(res, {
      success: true,
      data: {
        record: updatedRecord,
        summary,
      },
    });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: "Không tìm thấy buổi điểm danh" });
    if (error.status === 403) return res.status(403).json({ success: false, message: "Bạn không có quyền với lớp này" });
    console.error("attendance patch record error:", error);
    return res.status(500).json({ success: false, message: "Không thể cập nhật bản ghi điểm danh" });
  }
};

const deleteSessionHandler = async (req, res) => {
  try {
    const teacherId = extractTeacherId(req);
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "Thiếu session id" });

    const session = await getSessionWithClass(id);
    if (!session) return res.status(404).json({ success: false, message: "Không tìm thấy buổi điểm danh" });
    await ensureTeacherOwnsClass(teacherId, session.session_class.class_id);

    const sessionDate = dayjs(session.date ?? session.day);
    if (!sessionDate.isSame(dayjs(), "day")) {
      return res.status(403).json({ success: false, message: "Chỉ được phép xoá buổi điểm danh trong ngày" });
    }

    await deleteSessionById(id);

    return jsonResponse(res, { success: true, data: { deleted: true } });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: "Không tìm thấy buổi điểm danh" });
    if (error.status === 403) return res.status(403).json({ success: false, message: "Bạn không có quyền với lớp này" });
    console.error("attendance delete session error:", error);
    return res.status(500).json({ success: false, message: "Không thể xoá buổi điểm danh" });
  }
};

const resetSessionCode = async (req, res) => {
  try {
    const teacherId = extractTeacherId(req);
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "Thiếu session id" });

    const session = await getSessionWithClass(id);
    if (!session) return res.status(404).json({ success: false, message: "Không tìm thấy buổi điểm danh" });
    await ensureTeacherOwnsClass(teacherId, session.session_class.class_id);
    if (typeIncludes(session.type, "manual")) {
      return res.status(400).json({ success: false, message: "Hình thức thủ công không hỗ trợ reset mã" });
    }
    if ((session.attempts ?? 0) >= MAX_ATTEMPTS) {
      const updated = await updateSession(session.id, {
        status: "closed",
        expiresAt: dayjs().utc().toDate(),
      });
      return res.status(409).json({ success: false, message: "Đã hết lượt reset mã", data: serializeSession(updated) });
    }

    const now = dayjs().utc();
    const updated = await updateSession(session.id, {
      code: generateCode(),
      expiresAt: now.add(SESSION_DURATION_SECONDS, "second").toDate(),
      attempts: (session.attempts ?? 0) + 1,
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

const closeSession = async (req, res) => {
  try {
    const teacherId = extractTeacherId(req);
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "Thiếu session id" });

    const session = await getSessionWithClass(id);
    if (!session) return res.status(404).json({ success: false, message: "Không tìm thấy buổi điểm danh" });
    await ensureTeacherOwnsClass(teacherId, session.session_class.class_id);

    const updated = await updateSession(session.id, {
      status: "closed",
      expiresAt: dayjs().utc().toDate(),
      endedAt: dayjs().utc().toDate(),
    });

    return jsonResponse(res, { success: true, data: serializeSession(updated) });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    if (error.status === 403) return res.status(403).json({ success: false, message: "Bạn không có quyền với lớp này" });
    console.error("attendance close session error:", error);
    return res.status(500).json({ success: false, message: "Không thể kết thúc buổi điểm danh" });
  }
};

const getSessionDetail = async (req, res) => {
  try {
    const teacherId = extractTeacherId(req);
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "Thiếu session id" });

    const session = await getSessionWithClass(id);
    if (!session) return res.status(404).json({ success: false, message: "Không tìm thấy buổi điểm danh" });
    await ensureTeacherOwnsClass(teacherId, session.session_class.class_id);

    const totalStudents = session.totalStudents ?? (await countClassStudents(session.session_class.class_id));

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
    const teacherId = extractTeacherId(req);
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "Thiếu session id" });

    const session = await getSessionWithClass(id);
    if (!session) return res.status(404).json({ success: false, message: "Không tìm thấy buổi điểm danh" });
    await ensureTeacherOwnsClass(teacherId, session.session_class.class_id);

    const [students, records] = await Promise.all([
      getClassStudents(session.session_class.class_id),
      getAttendanceRecords(id),
    ]);
      // Map each class student to their attendance record (if any).
      const recordMap = new Map((records || []).map((r) => [r.studentId, r]));
      const data = (students || []).map((student) => {
        const record = recordMap.get(student.student_id);
        return {
          studentId: student.student_id,
          fullName: student.full_name,
          email: student.email,
          course: student.course,
          status: record?.status || "absent",
          markedAt: record?.recordedAt ? dayjs(record.recordedAt).toISOString() : null,
          modifiedAt: record?.modifiedAt ? dayjs(record.modifiedAt).toISOString() : null,
          modifiedBy: record?.modifiedBy || null,
          note: record?.note || null,
        };
      });

      const { total, present, excused, absent } = summarizeRecords(data);
      return jsonResponse(res, {
        success: true,
        data,
        summary: {
          total,
          present,
          excused,
          absent,
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
    const teacherId = extractTeacherId(req);
    const { id } = req.params;
    const { students } = req.body || {};
    if (!id) return res.status(400).json({ success: false, message: "Thiếu session id" });
    if (!Array.isArray(students) || !students.length) {
      return res.status(400).json({ success: false, message: "Danh sách sinh viên trống" });
    }

    const session = await getSessionWithClass(id);
    if (!session) return res.status(404).json({ success: false, message: "Không tìm thấy buổi điểm danh" });
    await ensureTeacherOwnsClass(teacherId, session.session_class.class_id);
    if (!typeIncludes(session.type, "manual")) {
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
        modifiedBy: teacherId,
      };
    });

    await saveManualAttendance(id, entries);
    const [updatedStudents, records] = await Promise.all([
      getClassStudents(session.session_class.class_id),
      getAttendanceRecords(id),
    ]);
    const recordMap = new Map(records.map((item) => [item.studentId, item]));

    const data = updatedStudents.map((student) => {
      const record = recordMap.get(student.student_id);
      return {
        studentId: student.student_id,
        fullName: student.full_name,
        email: student.email,
        course: student.course,
        status: record?.status || "absent",
        markedAt: record?.recordedAt ? dayjs(record.recordedAt).toISOString() : null,
        modifiedAt: record?.modifiedAt ? dayjs(record.modifiedAt).toISOString() : null,
        modifiedBy: record?.modifiedBy || null,
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

module.exports = {
  listTeacherClasses,
  listClassSlots,
  createOrGetSession,
  endAttendanceSession,
  resetSessionCode,
  getSessionDetail,
  getSessionStudents,
  updateManualAttendance,
  closeSession,
  listSessionsByDate: listSessionsByDateHandler,
  getSessionWithRecords: getSessionWithRecordsHandler,
  patchAttendanceRecord,
  deleteSession: deleteSessionHandler,
};
