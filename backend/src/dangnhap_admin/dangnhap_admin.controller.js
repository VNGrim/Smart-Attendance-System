const StudentModel = require("./dangnhap_admin.model");

exports.loginAdmin = async (req, res) => {
  try {
    const { adminId, password } = req.body;
    const user = await StudentModel.findAdminById(adminId, password);

    if (user) {
      res.json({ success: true, role: user.role, message: "Login thành công" });
    } else {
      res.status(401).json({ success: false, message: "Sai mã admin hoặc mật khẩu" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
