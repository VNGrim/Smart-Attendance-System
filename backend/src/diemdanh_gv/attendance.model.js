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
     AND FIND_IN_SET(UPPER(c.class_id), REPLACE(UPPER(s.classes), ' ', '')) > 0
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

async function getClassById(classId) {
  await prisma.$ready;
  return prisma.classes.findUnique({ where: { class_id: classId } });
}

async function getClassSlotsByDay(classId, dayKey) {
  await prisma.$ready;
  return prisma.timetable.findMany({
    where: {
      classes: classId,
      ...(dayKey ? { day_of_week: dayKey } : {}),
    },
    select: {
      id: true,
      slot_id: true,
      room: true,
      week_key: true,
      subject_name: true,
      teacher_name: true,
      day_of_week: true,
    },
    orderBy: { slot_id: "asc" },
  });
}

async function findLatestSession({ classId, slotId, day }) {
  await prisma.$ready;
  return prisma.attendance_sessions.findFirst({
    where: { class_id: classId, slot_id: slotId, day },
    orderBy: { created_at: "desc" },
  });
}

async function createSession(data) {
  await prisma.$ready;
  return prisma.attendance_sessions.create({ data });
}

async function updateSession(id, data) {
  await prisma.$ready;
  return prisma.attendance_sessions.update({ where: { id }, data });
}

async function getSessionById(id) {
  await prisma.$ready;
  return prisma.attendance_sessions.findUnique({ where: { id } });
}

async function getSessionWithClass(id) {
  await prisma.$ready;
  return prisma.attendance_sessions.findUnique({
    where: { id },
    include: {
      session_class: true,
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
      AND FIND_IN_SET(UPPER(${normalized}), REPLACE(UPPER(s.classes), ' ', '')) > 0
    ORDER BY s.full_name
  `;
}

async function getAttendanceRecords(sessionId) {
  await prisma.$ready;
  return prisma.attendance_records.findMany({
    where: { session_id: sessionId },
    select: {
      student_id: true,
      status: true,
      marked_at: true,
      note: true,
    },
  });
}

async function saveManualAttendance(sessionId, entries) {
  if (!Array.isArray(entries) || !entries.length) return [];
  await prisma.$ready;
  const now = new Date();
  const tasks = entries.map((entry) =>
    prisma.attendance_records.upsert({
      where: {
        session_id_student_id: {
        session_id: sessionId,
        student_id: entry.studentId,
      },
      },
      update: {
        status: entry.status,
        marked_at: entry.markedAt || now,
        note: entry.note ?? null,
      },
      create: {
        session_id: sessionId,
        student_id: entry.studentId,
        status: entry.status,
        marked_at: entry.markedAt || now,
        note: entry.note ?? null,
      },
    })
  );
  return prisma.$transaction(tasks);
}

async function countClassStudents(classId) {
  await prisma.$ready;
  const normalized = normalizeClassId(classId);
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*) AS total
    FROM students s
    WHERE s.classes IS NOT NULL
      AND FIND_IN_SET(UPPER(${normalized}), REPLACE(UPPER(s.classes), ' ', '')) > 0
  `;
  return rows?.[0]?.total || 0;
}

async function getClassHistory(classId, slotId, limit = 20) {
  await prisma.$ready;
  return prisma.attendance_sessions.findMany({
    where: {
      class_id: classId,
      ...(slotId ? { slot_id: slotId } : {}),
    },
    include: {
      records: {
        select: {
          status: true,
        },
      },
    },
    orderBy: [{ day: "desc" }, { created_at: "desc" }],
    take: limit,
  });
}

module.exports = {
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
};
