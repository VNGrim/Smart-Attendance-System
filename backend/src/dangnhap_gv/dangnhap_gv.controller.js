const StudentModel = require("./dangnhap_gv.model");

exports.loginTeacher = async (req, res) => {
  try {
    const { teacherId, password } = req.body;
    const user = await TeacherModel.findTeacherById(teacherId, password);

    if (user) {
      res.json({ success: true, role: user.role, message: "Login thành công" });
    } else {
      res.status(401).json({ success: false, message: "Sai mã GV hoặc mật khẩu" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
