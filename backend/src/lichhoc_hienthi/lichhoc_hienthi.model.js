const prisma = require("../config/prisma");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");

dayjs.extend(utc);

const normalizeClassId = (value) => String(value ?? "").trim().toUpperCase();

function formatTime(value) {
  if (!value) return null;
  return dayjs(value).utc().format("HH:mm");
}

function normalizeDay(value) {
  if (!value) return "Mon";
  const str = String(value).trim();
  const upper = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  const allowed = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return allowed.includes(upper) ? upper : "Mon";
}

function computeDateFromWeekDay(weekKey, day) {
  if (!weekKey) return null;
  const match = String(weekKey).trim().match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) return null;

  // Tính thứ 2 của tuần ISO (UTC)
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay() || 7; // 1=Mon..7=Sun
  const weekStart = new Date(simple);
  weekStart.setUTCDate(simple.getUTCDate() - (dayOfWeek - 1));
  weekStart.setUTCHours(0, 0, 0, 0);

  const normalizedDay = normalizeDay(day);
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const index = order.indexOf(normalizedDay);
  if (index < 0) return null;

  const target = new Date(weekStart);
  target.setUTCDate(weekStart.getUTCDate() + index);
  target.setUTCHours(0, 0, 0, 0);
  return target;
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

  // Get subject codes from classes table
  const classIds = [...new Set(rows.map(r => r.classes))];
  const classesData = await prisma.classes.findMany({
    where: { class_id: { in: classIds } },
    select: { class_id: true, subject_code: true, subject_name: true }
  });
  
  const classMap = new Map(classesData.map(c => [c.class_id, c]));

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

    const session = await prisma.attendanceSession.findFirst({
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

    if (!session) {
      statusCache.set(cacheKey, null);
      return null;
    }

    const recordStatus = session.records?.[0]?.status ?? null;
    let normalizedStatus = recordStatus;

    if (!normalizedStatus && (session.status === "ended" || session.status === "closed")) {
      normalizedStatus = "absent";
    }

    statusCache.set(cacheKey, normalizedStatus);
    return normalizedStatus;
  };

  const mappedRows = await Promise.all(
    rows.map(async (row) => {
      const slotId = Number(row.slot_id);
      const classInfo = classMap.get(row.classes);
      const effectiveDate = row.date
        ? dayjs(row.date).utc().startOf("day").toDate()
        : computeDateFromWeekDay(row.week_key, row.day_of_week);
      const attendanceStatus = await resolveAttendanceStatus({
        classId: row.classes,
        slotId,
        date: effectiveDate,
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
        subject_name: classInfo?.subject_name || row.subject_name || row.classes,
        subject_code: classInfo?.subject_code || "",
        week_key: row.week_key,
        date: effectiveDate ? dayjs(effectiveDate).utc().format("YYYY-MM-DD") : null,
        attendance_status: attendanceStatus,
        attendanceStatus,
      };
    })
  );

  return mappedRows;
};
