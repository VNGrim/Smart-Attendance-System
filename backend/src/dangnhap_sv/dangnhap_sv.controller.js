const bcrypt = require("bcrypt");
const StudentModel = require("./dangnhap_sv.model");

exports.loginStudent = async (req, res) => {
  try {
    const { studentId, password } = req.body;
    if (!studentId || !password) {
      return res.status(400).json({ success: false, message: "Thiếu mã SV hoặc mật khẩu" });
    }

    const user = await StudentModel.findStudentById(studentId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản" });
    }

    // So sánh mật khẩu với hash trong DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Sai mật khẩu" });
    }

    // Đăng nhập thành công
    res.json({
      success: true,
      role: user.role,
      message: "Đăng nhập thành công",
      user: {
        student_id: user.user_code,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    console.error("❌ Lỗi loginStudent:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
