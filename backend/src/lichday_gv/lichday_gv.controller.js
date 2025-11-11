const Model = require("./lichday_gv.model");

exports.getTeacherInfo = async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (!teacherId) return res.status(400).json({ success: false, message: "Thiếu teacherId" });

    const info = await Model.getTeacherInfo(teacherId);
    if (!info) return res.status(404).json({ success: false, message: "Không tìm thấy giảng viên" });

    return res.json({ success: true, data: info });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

exports.getTeacherSchedule = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { week } = req.query;
    if (!teacherId) return res.status(400).json({ success: false, message: "Thiếu teacherId" });

    const result = await Model.getTeacherSchedule(teacherId, week);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
