const ThongBaoModel = require('./thongbao_hienthi.model');

class ThongBaoController {
  // API lấy danh sách thông báo
  static async getAllAnnouncements(req, res) {
    try {
      const announcements = await ThongBaoModel.getAllAnnouncements();
      
      // Format dữ liệu trả về
      const formattedAnnouncements = announcements.map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        created_at: announcement.created_at,
        date: announcement.created_at.toISOString().split('T')[0], // Format YYYY-MM-DD
        type: "general" // Mặc định type là general
      }));
      
      res.json({
        success: true,
        data: formattedAnnouncements,
        message: "Lấy danh sách thông báo thành công"
      });
    } catch (error) {
      console.error("Error in getAllAnnouncements:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi hệ thống. Không thể lấy danh sách thông báo.",
        error: error.message
      });
    }
  }

  // API lấy chi tiết thông báo theo ID
  static async getAnnouncementById(req, res) {
    try {
      const { id } = req.params;
      
      // Validate ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "ID thông báo không hợp lệ"
        });
      }

      const announcement = await ThongBaoModel.getAnnouncementById(id);
      
      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông báo"
        });
      }

      // Format dữ liệu trả về
      const formattedAnnouncement = {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        created_at: announcement.created_at,
        date: announcement.created_at.toISOString().split('T')[0], // Format YYYY-MM-DD
        type: "general"
      };
      
      res.json({
        success: true,
        data: formattedAnnouncement,
        message: "Lấy chi tiết thông báo thành công"
      });
    } catch (error) {
      console.error("Error in getAnnouncementById:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi hệ thống. Không thể lấy chi tiết thông báo.",
        error: error.message
      });
    }
  }

  // API lấy thông tin sinh viên theo student_id
  static async getStudentInfo(req, res) {
    try {
      const { studentId } = req.params;
      
      // Validate studentId
      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: "Mã sinh viên không được để trống"
        });
      }

      const student = await ThongBaoModel.getStudentInfo(studentId);
      
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông tin sinh viên"
        });
      }

      // Format dữ liệu trả về
      const formattedStudent = {
        student_id: student.student_id,
        full_name: student.full_name,
        course: student.course,
        classes: student.classes ? student.classes.split(',').map(cls => cls.trim()) : []
      };
      
      res.json({
        success: true,
        data: formattedStudent,
        message: "Lấy thông tin sinh viên thành công"
      });
    } catch (error) {
      console.error("Error in getStudentInfo:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi hệ thống. Không thể lấy thông tin sinh viên.",
        error: error.message
      });
    }
  }

  // API lấy thông tin sinh viên từ user_code (từ session/login)
  static async getStudentByUserCode(req, res) {
    try {
      const { userCode } = req.params;
      
      // Validate userCode
      if (!userCode) {
        return res.status(400).json({
          success: false,
          message: "Mã đăng nhập không được để trống"
        });
      }

      const student = await ThongBaoModel.getStudentByAccount(userCode);
      
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông tin sinh viên"
        });
      }

      // Format dữ liệu trả về
      const formattedStudent = {
        student_id: student.student_id,
        full_name: student.full_name,
        course: student.course,
        classes: student.classes ? student.classes.split(',').map(cls => cls.trim()) : []
      };
      
      res.json({
        success: true,
        data: formattedStudent,
        message: "Lấy thông tin sinh viên thành công"
      });
    } catch (error) {
      console.error("Error in getStudentByUserCode:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi hệ thống. Không thể lấy thông tin sinh viên.",
        error: error.message
      });
    }
  }
}

module.exports = ThongBaoController;

