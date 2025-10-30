const prisma = require("../config/prisma");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");

dayjs.extend(utc);

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

  return rows.map((row) => ({
    day_of_week: row.day_of_week,
    slot_id: row.slot_id,
    start_time: formatTime(row.time_slots?.start_time),
    end_time: formatTime(row.time_slots?.end_time),
    room: row.room_name || row.room || "",
    class_name: row.subject_name || row.classes,
    teacher_name: row.teacher_name || "",
    class_id: row.classes,
    subject_name: row.subject_name || row.classes,
    week_key: row.week_key,
  }));
};
