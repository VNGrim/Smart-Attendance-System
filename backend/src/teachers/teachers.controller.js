const prisma = require("../config/prisma");

// Lấy thông tin giảng viên theo ID
exports.getTeacherInfo = async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    const teacher = await prisma.teachers.findUnique({
      where: { teacher_id: teacherId },
      select: {
        teacher_id: true,
        full_name: true,
        email: true,
        phone: true,
        faculty: true,
        subject: true,
        avatar_url: true,
        status: true
      }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy giảng viên"
      });
    }

    // Map faculty -> department để frontend nhất quán
    const responseData = {
      ...teacher,
      department: teacher.faculty
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (err) {
    console.error("Error fetching teacher info:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thông tin giảng viên"
    });
  }
};

// Cập nhật avatar giảng viên (nhận URL từ Supabase)
exports.updateAvatar = async (req, res) => {
  try {
    const { teacher_id, avatar_url } = req.body || {};

    if (!teacher_id || !avatar_url) {
      return res.status(400).json({
        success: false,
        message: "Thiếu teacher_id hoặc avatar_url",
      });
    }

    const updatedTeacher = await prisma.teachers.update({
      where: { teacher_id },
      data: { avatar_url },
    });

    res.json({
      success: true,
      message: "Cập nhật avatar thành công",
      avatar_url: updatedTeacher.avatar_url,
    });
  } catch (err) {
    console.error("Error updating teacher avatar:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật avatar",
    });
  }
};
