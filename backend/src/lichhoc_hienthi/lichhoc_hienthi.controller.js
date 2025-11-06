const Model = require("./lichhoc_hienthi.model");

exports.getStudentInfo = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) return res.status(400).json({ success: false, message: "Thiếu studentId" });

    const info = await Model.getStudentInfo(studentId);
    if (!info) return res.status(404).json({ success: false, message: "Không tìm thấy sinh viên" });

    return res.json({ success: true, data: info });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

exports.getStudentSchedule = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { week } = req.query;
    if (!studentId) return res.status(400).json({ success: false, message: "Thiếu studentId" });

    const rows = await Model.getStudentSchedule(studentId, week);

    // Map về cấu trúc thuận tiện cho UI lịch: theo slot -> day (theo slot_id của DB)
    const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const slots = [1,2,3,4];
    const grid = {};
    slots.forEach(s => {
      grid[s] = {};
      days.forEach(d => { grid[s][d] = null; });
    });

    rows.forEach(r => {
      grid[r.slot_id][r.day_of_week] = {
        classId: r.class_id,
        className: r.subject_code || r.class_name,
        subjectCode: r.subject_code,
        subjectName: r.subject_name,
        teacherName: r.teacher_name,
        startTime: r.start_time,
        endTime: r.end_time,
        room: r.room,
        color: pickColorForClass(r.subject_code || r.class_name),
        attendanceStatus: r.attendanceStatus ?? r.attendance_status ?? null,
        status: r.attendanceStatus ?? r.attendance_status ?? null,
      };
    });

    return res.json({ success: true, data: { flat: rows, grid } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Sinh màu theo tên lớp cố định (hash đơn giản)
function pickColorForClass(name) {
  const palette = ["#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#06b6d4", "#10b981"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}
