const prisma = require("../config/prisma");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");

dayjs.extend(utc);

const normalize = (v) => String(v ?? "").trim();

function formatTime(value) {
  if (!value) return null;
  return dayjs(value).utc().format("HH:mm");
}

exports.getTeacherInfo = async (teacherId) => {
  await prisma.$ready;
  return prisma.teachers.findUnique({
    where: { teacher_id: teacherId },
    select: {
      teacher_id: true,
      full_name: true,
      subject: true,
      classes: true,
      email: true,
      phone: true,
      faculty: true,
    },
  });
};

exports.getTeacherSchedule = async (teacherId, weekKey) => {
  await prisma.$ready;
  const teacher = await exports.getTeacherInfo(teacherId);
  if (!teacher) return { flat: [], grid: {} };

  const where = {
    teacher_id: teacherId,
  };
  if (weekKey) where.week_key = weekKey;

  const rows = await prisma.timetable.findMany({
    where,
    include: { time_slots: true },
    orderBy: [
      { day_of_week: "asc" },
      { slot_id: "asc" },
      { classes: "asc" },
    ],
  });

  // Load subject_code/subject_name from classes table
  const classIds = [...new Set(rows.map((r) => r.classes).filter(Boolean))];
  const classesData = await prisma.classes.findMany({
    where: { class_id: { in: classIds } },
    select: { class_id: true, subject_code: true, subject_name: true },
  });
  const classMap = new Map(classesData.map((c) => [c.class_id, c]));

  const flat = rows.map((row) => {
    const slotId = Number(row.slot_id);
    const info = classMap.get(row.classes);
    return {
      day_of_week: row.day_of_week,
      slot_id: slotId,
      start_time: formatTime(row.time_slots?.start_time),
      end_time: formatTime(row.time_slots?.end_time),
      room: row.room_name || row.room || "",
      class_name: row.subject_name || row.classes,
      teacher_name: row.teacher_name || teacher.full_name || "",
      class_id: row.classes,
      subject_name: info?.subject_name || row.subject_name || row.classes,
      subject_code: info?.subject_code || "",
      week_key: row.week_key,
      date: row.date ? dayjs(row.date).utc().format("YYYY-MM-DD") : null,
    };
  });

  // Build grid 4 slots x 7 days like lichhoc_sv
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const slots = [1, 2, 3, 4];
  const grid = {};
  for (const s of slots) {
    grid[s] = {};
    for (const d of days) grid[s][d] = null;
  }

  for (const r of flat) {
    const s = Number(r.slot_id);
    const d = r.day_of_week;
    if (!s || !days.includes(d)) continue;
    grid[s][d] = {
      classId: r.class_id,
      className: r.subject_code || r.class_name,
      subjectCode: r.subject_code,
      subjectName: r.subject_name,
      teacherName: r.teacher_name,
      startTime: r.start_time,
      endTime: r.end_time,
      room: r.room,
      weekKey: r.week_key,
      date: r.date,
    };
  }

  return { flat, grid };
};
