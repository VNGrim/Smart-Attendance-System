const db = require("../config/db");

exports.getStudentInfo = async (studentId) => {
  const [rows] = await db.execute(
    `SELECT s.student_id, s.full_name, s.course, s.classes
     FROM students s
     WHERE s.student_id = ?`,
    [studentId]
  );
  return rows[0] || null;
};

exports.getStudentSchedule = async (studentId) => {
  // Lấy danh sách lớp mà SV theo học (CSV)
  const student = await this.getStudentInfo(studentId);
  if (!student || !student.classes) return [];

  const classList = student.classes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (classList.length === 0) return [];

  // Tạo placeholders (?, ?, ...) theo số lớp
  const placeholders = classList.map(() => "?").join(",");

  // Truy vấn thời khóa biểu: join time_slots để lấy giờ, join teachers để lấy tên GV từ CSV classes
  const [rows] = await db.execute(
    `SELECT t.day_of_week, t.slot_id, ts.start_time, ts.end_time, t.room,
            t.classes AS class_name,
            COALESCE(tea.full_name, '') AS teacher_name
     FROM timetable t
     JOIN time_slots ts ON ts.slot_id = t.slot_id
     LEFT JOIN teachers tea ON FIND_IN_SET(t.classes, REPLACE(tea.classes,' ','')) > 0
     WHERE t.classes IN (${placeholders})
     ORDER BY FIELD(t.day_of_week,'Mon','Tue','Wed','Thu','Fri','Sat','Sun'), t.slot_id`,
    classList
  );
  return rows;
};


