const StudentModel = require("./dangnhap_sv.model");

exports.loginStudent = async (req, res) => {
  try {
    const { studentId, password } = req.body;
    const user = await StudentModel.findStudentById(studentId, password);

    if (user) {
      res.json({ success: true, role: user.role, message: "Login thành công" });
    } else {
      res.status(401).json({ success: false, message: "Sai mã SV hoặc mật khẩu" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
