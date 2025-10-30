const prisma = require("../config/prisma");

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
      COUNT(DISTINCT sc.student_id) AS student_count
    FROM classes c
    LEFT JOIN student_classes sc ON sc.class_id = c.class_id
    WHERE c.teacher_id = ${teacherId}
    GROUP BY c.class_id, c.class_name, c.subject_name, c.subject_code, c.semester, c.school_year
    ORDER BY COALESCE(c.school_year, '0000') DESC, COALESCE(c.semester, '') DESC, c.class_name ASC
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
      day_of_week: dayKey,
    },
    select: {
      id: true,
      slot_id: true,
      room: true,
      week_key: true,
      subject_name: true,
      teacher_name: true,
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
  return prisma.$queryRaw`
    SELECT
      s.student_id,
      s.full_name,
      s.email,
      s.course,
      sc.status,
      sc.enrolled_at
    FROM students s
    JOIN student_classes sc ON sc.student_id = s.student_id
    WHERE sc.class_id = ${classId}
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
  return prisma.student_classes.count({ where: { class_id: classId } });
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
