const prisma = require("../config/prisma");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");

dayjs.extend(utc);

const normalizeClassId = (value) => String(value ?? "").trim().toUpperCase();

function formatTime(value) {
  if (!value) return null;
  return dayjs(value).utc().format("HH:mm");
}

exports.getStudentInfo = async (studentId) => {
  await prisma.$ready;
  return prisma.students.findUnique({
    where: { student_id: studentId },
    select: {
      student_id: true,
      full_name: true,
      course: true,
      classes: true,
    },
  });
};

exports.getStudentSchedule = async (studentId, weekKey) => {
  await prisma.$ready;
  const student = await exports.getStudentInfo(studentId);
  if (!student?.classes) return [];

  const classList = student.classes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!classList.length) return [];

  const where = {
    classes: { in: classList },
  };
  if (weekKey) {
    where.week_key = weekKey;
  }

  const rows = await prisma.timetable.findMany({
    where,
    include: {
      time_slots: true,
    },
    orderBy: [
      { day_of_week: "asc" },
      { slot_id: "asc" },
      { classes: "asc" },
    ],
  });

  const statusCache = new Map();
  const targetStudentId = student?.student_id ? String(student.student_id).trim() : null;

  const resolveAttendanceStatus = async ({ classId, slotId, date }) => {
    if (!targetStudentId) return null;
    const normalizedClassId = normalizeClassId(classId);
    const normalizedSlot = Number(slotId);
    if (!normalizedClassId || Number.isNaN(normalizedSlot) || normalizedSlot <= 0) return null;

    const normalizedDate = date ? dayjs(date).utc().startOf("day").toDate() : null;
    const cacheKey = `${normalizedClassId}|${normalizedSlot}|${targetStudentId}|${normalizedDate ? dayjs(normalizedDate).format("YYYY-MM-DD") : "latest"}`;
    if (statusCache.has(cacheKey)) return statusCache.get(cacheKey);

    const baseWhere = {
      classId: normalizedClassId,
      slot: normalizedSlot,
    };

    let session = await prisma.attendanceSession.findFirst({
      where: normalizedDate ? { ...baseWhere, date: normalizedDate } : baseWhere,
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        records: {
          where: { studentId: targetStudentId },
          select: { status: true },
          take: 1,
        },
      },
    });

    if (!session && normalizedDate) {
      session = await prisma.attendanceSession.findFirst({
        where: baseWhere,
        orderBy: [
          { date: "desc" },
          { createdAt: "desc" },
        ],
        include: {
          records: {
            where: { studentId: targetStudentId },
            select: { status: true },
            take: 1,
          },
        },
      });
    }

    const status = session?.records?.[0]?.status ?? null;
    statusCache.set(cacheKey, status);
    return status;
  };

  const mappedRows = await Promise.all(
    rows.map(async (row) => {
      const slotId = Number(row.slot_id);
      const attendanceStatus = await resolveAttendanceStatus({
        classId: row.classes,
        slotId,
        date: row.date ?? null,
      });

      return {
        day_of_week: row.day_of_week,
        slot_id: slotId,
        start_time: formatTime(row.time_slots?.start_time),
        end_time: formatTime(row.time_slots?.end_time),
        room: row.room_name || row.room || "",
        class_name: row.subject_name || row.classes,
        teacher_name: row.teacher_name || "",
        class_id: row.classes,
        subject_name: row.subject_name || row.classes,
        week_key: row.week_key,
        date: row.date ? dayjs(row.date).utc().format("YYYY-MM-DD") : null,
        attendance_status: attendanceStatus,
        attendanceStatus,
      };
    })
  );

  return mappedRows;
};
