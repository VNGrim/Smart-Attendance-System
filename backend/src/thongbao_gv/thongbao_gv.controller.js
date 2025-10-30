const ThongBaoGVModel = require('./thongbao_gv.model');

class ThongBaoGVController {
  // API lấy danh sách thông báo cho giảng viên
  static async getAllAnnouncements(req, res) {
    try {
      const announcements = await ThongBaoGVModel.getAllAnnouncementsForTeacher();
      
      // Format dữ liệu trả về với đầy đủ thông tin
      const formattedAnnouncements = announcements.map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        sender: announcement.sender || 'Admin',
        date: announcement.created_at,
        dateFormatted: announcement.created_at ? new Date(announcement.created_at).toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : '',
        time: announcement.created_at ? new Date(announcement.created_at).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit'
        }) : '',
        type: announcement.type || 'Khác',
        status: announcement.status || 'Đã gửi',
        category: announcement.category || 'general'
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

  // API lấy chi tiết thông báo theo ID cho giảng viên
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

      const announcement = await ThongBaoGVModel.getAnnouncementByIdForTeacher(id);
      
      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông báo"
        });
      }

      // Format dữ liệu trả về với đầy đủ thông tin
      const formattedAnnouncement = {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        sender: announcement.sender || 'Admin',
        date: announcement.created_at,
        dateFormatted: announcement.created_at ? new Date(announcement.created_at).toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : '',
        time: announcement.created_at ? new Date(announcement.created_at).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit'
        }) : '',
        type: announcement.type || 'Khác',
        status: announcement.status || 'Đã gửi',
        category: announcement.category || 'general'
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
}

module.exports = ThongBaoGVController;

