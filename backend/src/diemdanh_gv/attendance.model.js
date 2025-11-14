const prisma = require("../config/prisma");

const normalizeClassId = (value) => String(value ?? "").trim().toUpperCase();

async function getClassesByTeacher(teacherId) {
  await prisma.$ready;
  const rows = await prisma.$queryRaw`
    SELECT
      c.class_id,
      c.class_name,
      c.subject_name,
      c.subject_code,
      c.semester,
      c.school_year,
      c.teacher_id,
      c.status,
      COUNT(DISTINCT s.student_id) AS student_count
    FROM classes c
    LEFT JOIN students s
      ON s.classes IS NOT NULL
     AND CONCAT(',', REPLACE(UPPER(s.classes), ' ', ''), ',') LIKE CONCAT('%,', UPPER(c.class_id), ',%')
    WHERE c.teacher_id = ${teacherId}
    GROUP BY
      c.class_id,
      c.class_name,
      c.subject_name,
      c.subject_code,
      c.semester,
      c.school_year,
      c.teacher_id,
      c.status
    ORDER BY COALESCE(c.school_year, '9999') DESC, COALESCE(c.semester, '') DESC, c.class_name ASC
  `;
  return rows;
}

async function getClassesByTeacherAndDay(teacherId, dayKey, targetDate) {
  await prisma.$ready;
  const rows = await prisma.$queryRaw`
    SELECT
      c.class_id,
      c.class_name,
      c.subject_name,
      c.subject_code,
      c.semester,
      c.school_year,
      c.teacher_id,
      c.status,
      COUNT(DISTINCT s.student_id) AS student_count
    FROM classes c
    INNER JOIN timetable t
      ON t.classes = c.class_id
    LEFT JOIN students s
      ON s.classes IS NOT NULL
     AND CONCAT(',', REPLACE(UPPER(s.classes), ' ', ''), ',') LIKE CONCAT('%,', UPPER(c.class_id), ',%')
    WHERE (c.teacher_id = ${teacherId} OR t.teacher_id = ${teacherId})
      AND (
        -- Lịch theo ngày cố định trong tuần (t.date IS NULL)
        (t.date IS NULL AND t.day_of_week::text = ${dayKey})
        OR
        -- Lịch dạy bù / thay đổi theo ngày cụ thể
        (t.date = ${targetDate}::date)
      )
    GROUP BY
      c.class_id,
      c.class_name,
      c.subject_name,
      c.subject_code,
      c.semester,
      c.school_year,
      c.teacher_id,
      c.status
    ORDER BY c.class_name ASC
  `;
  return rows;
}

async function getClassById(classId) {
  await prisma.$ready;
  return prisma.classes.findUnique({ where: { class_id: normalizeClassId(classId) } });
}

async function getClassSlotsByDay(classId, dayKey, targetDate) {
  await prisma.$ready;
  const normalizedClass = normalizeClassId(classId);

  // Nếu có targetDate (chuỗi YYYY-MM-DD), ưu tiên lịch dạy cụ thể theo ngày
  if (targetDate) {
    const byDate = await prisma.$queryRaw`
      SELECT
        id,
        slot_id,
        room,
        week_key,
        subject_name,
        teacher_name,
        day_of_week
      FROM timetable
      WHERE classes = ${normalizedClass}
        AND date = ${targetDate}::date
      ORDER BY slot_id ASC
    `;

    if (byDate.length) {
      return byDate;
    }
  }

  // Fallback: lịch cố định theo thứ trong tuần (date IS NULL)
  if (dayKey) {
    const rowsWithDay = await prisma.$queryRaw`
      SELECT
        id,
        slot_id,
        room,
        week_key,
        subject_name,
        teacher_name,
        day_of_week
      FROM timetable
      WHERE classes = ${normalizedClass}
        AND date IS NULL
        AND day_of_week::text = ${dayKey}
      ORDER BY slot_id ASC
    `;
    return rowsWithDay;
  }

  const rows = await prisma.$queryRaw`
    SELECT
      id,
      slot_id,
      room,
      week_key,
      subject_name,
      teacher_name,
      day_of_week
    FROM timetable
    WHERE classes = ${normalizedClass}
      AND date IS NULL
    ORDER BY slot_id ASC
  `;

  return rows;
}

async function getAttendanceRecord(sessionId, studentId) {
  await prisma.$ready;
  return prisma.attendanceRecord.findUnique({
    where: {
      sessionId_studentId: {
        sessionId,
        studentId,
      },
    },
  });
}

async function getAttendanceRecordById(id) {
  await prisma.$ready;
  return prisma.attendanceRecord.findUnique({ where: { id } });
}

async function findLatestSession({ classId, slotId, day }) {
  await prisma.$ready;
  return prisma.attendanceSession.findFirst({
    where: { classId: normalizeClassId(classId), slot: slotId, date: day },
    orderBy: { createdAt: "desc" },
  });
}

async function findActiveSessionByCode(code) {
  await prisma.$ready;
  return prisma.attendanceSession.findFirst({
    where: {
      code,
      status: "active",
    },
    orderBy: { createdAt: "desc" },
  });
}

const mapSessionWriteData = (data = {}) => {
  const payload = {};
  if (data.classId !== undefined) payload.classId = data.classId;
  if (data.slot !== undefined) payload.slot = data.slot;
  if (data.date !== undefined) payload.date = data.date;
  if (data.type !== undefined) {
    payload.type = data.type;
  }
  if (data.code !== undefined) payload.code = data.code;
  if (data.status !== undefined) payload.status = data.status;
  if (data.attempts !== undefined) payload.attempts = data.attempts;
  if (data.expiresAt !== undefined) payload.expiresAt = data.expiresAt;
  if (data.createdBy !== undefined) payload.createdBy = data.createdBy;
  if (data.totalStudents !== undefined) payload.totalStudents = data.totalStudents;
  if (data.endedAt !== undefined) payload.endedAt = data.endedAt;
  if (data.updatedAt !== undefined) payload.updatedAt = data.updatedAt;
  return payload;
};

async function createSession(data) {
  await prisma.$ready;
  return prisma.attendanceSession.create({
    data: mapSessionWriteData(data),
  });
}

async function updateSession(id, data) {
  await prisma.$ready;
  return prisma.attendanceSession.update({ where: { id }, data: mapSessionWriteData(data) });
}

async function getSessionById(id) {
  await prisma.$ready;
  return prisma.attendanceSession.findUnique({ where: { id } });
}

async function getSessionWithClass(id) {
  await prisma.$ready;
  return prisma.attendanceSession.findUnique({
    where: { id },
    include: {
      session_class: true,
      records: true,
    },
  });
}

async function getClassStudents(classId) {
  await prisma.$ready;
  const normalized = normalizeClassId(classId);
  return prisma.$queryRaw`
    SELECT
      s.student_id,
      s.full_name,
      s.email,
      s.course,
      s.status,
      NULL AS enrolled_at
    FROM students s
    WHERE s.classes IS NOT NULL
      AND CONCAT(',', REPLACE(UPPER(s.classes), ' ', ''), ',') LIKE CONCAT('%,', ${normalized}, ',%')
    ORDER BY s.full_name
  `;
}

async function getAttendanceRecords(sessionId) {
  await prisma.$ready;
  return prisma.attendanceRecord.findMany({
    where: { sessionId },
    select: {
      id: true,
      studentId: true,
      status: true,
      recordedAt: true,
      modifiedBy: true,
      modifiedAt: true,
      note: true,
    },
  });
}

async function saveManualAttendance(sessionId, entries) {
  if (!Array.isArray(entries) || !entries.length) return [];
  await prisma.$ready;
  const now = new Date();
  const tasks = entries.map((entry) =>
    prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId: entry.studentId,
        },
      },
      update: {
        status: entry.status,
        recordedAt: entry.markedAt || now,
        modifiedAt: now,
        modifiedBy: entry.modifiedBy || null,
        note: entry.note ?? null,
      },
      create: {
        sessionId,
        studentId: entry.studentId,
        status: entry.status,
        recordedAt: entry.markedAt || now,
        modifiedAt: entry.modifiedBy ? now : null,
        modifiedBy: entry.modifiedBy || null,
        note: entry.note ?? null,
      },
    })
  );
  return prisma.$transaction(tasks);
}

async function isStudentInClass(studentId, classId) {
  await prisma.$ready;
  const normalizedClass = normalizeClassId(classId);
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*) AS total
    FROM students s
    WHERE s.student_id = ${studentId}
      AND s.classes IS NOT NULL
      AND CONCAT(',', REPLACE(UPPER(s.classes), ' ', ''), ',') LIKE CONCAT('%,', ${normalizedClass}, ',%')
  `;
  return Boolean(rows?.[0]?.total);
}

async function markStudentAttendance(sessionId, studentId, status = "present", note = null) {
  await prisma.$ready;
  const now = new Date();
  return prisma.attendanceRecord.upsert({
    where: {
      sessionId_studentId: {
        sessionId,
        studentId,
      },
    },
    update: {
      status,
      recordedAt: now,
      modifiedAt: now,
      note,
    },
    create: {
      sessionId,
      studentId,
      status,
      recordedAt: now,
      note,
    },
  });
}

async function countClassStudents(classId) {
  await prisma.$ready;
  const normalized = normalizeClassId(classId);
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*) AS total
    FROM students s
    WHERE s.classes IS NOT NULL
      AND CONCAT(',', REPLACE(UPPER(s.classes), ' ', ''), ',') LIKE CONCAT('%,', ${normalized}, ',%')
  `;
  const value = rows?.[0]?.total ?? 0;
  return typeof value === "bigint" ? Number(value) : value;
}

async function getClassHistory(classId, slotId, limit = 20) {
  await prisma.$ready;
  return prisma.attendanceSession.findMany({
    where: {
      classId: normalizeClassId(classId),
      ...(slotId ? { slot: slotId } : {}),
    },
    include: {
      records: {
        select: {
          status: true,
        },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

async function findSessionByComposite({ classId, slot, date }) {
  await prisma.$ready;
  return prisma.attendanceSession.findFirst({
    where: {
      classId: normalizeClassId(classId),
      slot,
      date,
    },
  });
}

async function listSessionsByDate(classId, date) {
  await prisma.$ready;
  return prisma.attendanceSession.findMany({
    where: {
      classId: normalizeClassId(classId),
      date,
    },
    include: {
      records: {
        select: {
          status: true,
        },
      },
    },
    orderBy: [{ slot: "asc" }, { createdAt: "asc" }],
  });
}

async function getSessionWithRecords(sessionId) {
  await prisma.$ready;
  return prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      session_class: true,
      records: true,
    },
  });
}

async function updateAttendanceRecordById(recordId, data) {
  await prisma.$ready;
  return prisma.attendanceRecord.update({
    where: { id: recordId },
    data,
  });
}

async function deleteSessionById(sessionId) {
  await prisma.$ready;
  return prisma.attendanceSession.delete({ where: { id: sessionId } });
}

async function cleanupOldSessions({ before, statuses = ["ended", "closed", "expired"] } = {}) {
  await prisma.$ready;
  if (!before) return 0;

  const cutoff = new Date(before);
  if (Number.isNaN(cutoff.getTime())) return 0;
  cutoff.setHours(0, 0, 0, 0);

  const where = {
    date: {
      lt: cutoff,
    },
    ...(Array.isArray(statuses) && statuses.length
      ? {
          status: {
            in: statuses.map((item) => String(item).toLowerCase()),
          },
        }
      : {}),
  };

  const result = await prisma.attendanceSession.deleteMany({ where });
  return result.count ?? 0;
}

async function finalizeAttendanceSession({
  classId,
  slot,
  date,
  type,
  code = null,
  createdBy,
}) {
  await prisma.$ready;
  const normalizedClassId = normalizeClassId(classId);
  const slotNumber = Number(slot);
  if (!Number.isInteger(slotNumber) || slotNumber <= 0) {
    const error = new Error("INVALID_SLOT");
    error.status = 400;
    throw error;
  }

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const students = await getClassStudents(normalizedClassId);
  const studentIds = students.map((student) => student.student_id);
  const now = new Date();
  const normalizedType = String(type || "manual").toLowerCase();
  const normalizedCode = code ? String(code).trim().toUpperCase() : null;

  const session = await prisma.$transaction(async (tx) => {
    const existing = await tx.attendanceSession.findFirst({
      where: {
        classId: normalizedClassId,
        slot: slotNumber,
        date: targetDate,
      },
    });

    if (existing && existing.status === "ended") {
      const error = new Error("SESSION_ALREADY_ENDED");
      error.status = 409;
      throw error;
    }

    let persisted = existing;
    if (persisted) {
      persisted = await tx.attendanceSession.update({
        where: { id: existing.id },
        data: {
          type: normalizedType,
          code: normalizedCode,
          status: "ended",
          endedAt: now,
          expiresAt: now,
          totalStudents: studentIds.length,
          createdBy: existing.createdBy || createdBy,
        },
      });
    } else {
      persisted = await tx.attendanceSession.create({
        data: {
          classId: normalizedClassId,
          slot: slotNumber,
          date: targetDate,
          type: normalizedType,
          code: normalizedCode,
          createdBy,
          status: "ended",
          endedAt: now,
          expiresAt: now,
          totalStudents: studentIds.length,
        },
      });
    }

    const existingRecords = await tx.attendanceRecord.findMany({
      where: { sessionId: persisted.id },
      select: {
        studentId: true,
      },
    });
    const existingSet = new Set(existingRecords.map((item) => item.studentId));
    const toCreate = studentIds
      .filter((studentId) => !existingSet.has(studentId))
      .map((studentId) => ({
        sessionId: persisted.id,
        studentId,
        status: "absent",
      }));

    if (toCreate.length) {
      await tx.attendanceRecord.createMany({ data: toCreate });
    }

    return persisted;
  });

  const records = await getAttendanceRecords(session.id);

  return {
    session,
    records,
    students,
    totalStudents: studentIds.length,
  };
}

module.exports = {
  getClassesByTeacher,
  getClassesByTeacherAndDay,
  getClassById,
  getClassSlotsByDay,
  findLatestSession,
  findActiveSessionByCode,
  createSession,
  updateSession,
  getSessionById,
  getSessionWithClass,
  getClassStudents,
  getAttendanceRecords,
  saveManualAttendance,
  isStudentInClass,
  markStudentAttendance,
  getAttendanceRecord,
  getAttendanceRecordById,
  countClassStudents,
  getClassHistory,
  findSessionByComposite,
  listSessionsByDate,
  getSessionWithRecords,
  updateAttendanceRecordById,
  deleteSessionById,
  cleanupOldSessions,
  finalizeAttendanceSession,
};
