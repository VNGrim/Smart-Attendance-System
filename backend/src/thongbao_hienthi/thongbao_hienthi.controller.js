const ThongBaoModel = require('./thongbao_hienthi.model');

const normalizeBoolean = (value) => {
  if (value == null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'true' || trimmed === '1' || trimmed === 'yes') return true;
    if (trimmed === 'false' || trimmed === '0' || trimmed === 'no') return false;
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'boolean') return parsed;
      return normalizeBoolean(parsed);
    } catch {
      if (trimmed.includes('allowreply:true') || trimmed.includes('allow_reply":true')) {
        return true;
      }
      if (trimmed.includes('allowreply:false') || trimmed.includes('allow_reply":false')) {
        return false;
      }
      return null;
    }
  }
  if (typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, 'allowReply')) {
      return normalizeBoolean(value.allowReply);
    }
    if (Object.prototype.hasOwnProperty.call(value, 'allow_reply')) {
      return normalizeBoolean(value.allow_reply);
    }
    if (Object.prototype.hasOwnProperty.call(value, 'settings')) {
      const fromSettings = normalizeBoolean(value.settings);
      if (fromSettings != null) return fromSettings;
    }
    const entries = Array.isArray(value) ? value : Object.values(value);
    for (const item of entries) {
      const result = normalizeBoolean(item);
      if (result != null) return result;
    }
  }
  return null;
};

const resolveAllowReply = (record) => {
  const fromHistory = normalizeBoolean(record?.history);
  if (fromHistory != null) return fromHistory;
  if (record && Object.prototype.hasOwnProperty.call(record, 'allow_reply')) {
    return normalizeBoolean(record.allow_reply) ?? false;
  }
  return false;
};

const normalizeReplyUntil = (record) => {
  const source = record?.reply_until;
  if (!source) return null;
  const date = source instanceof Date ? source : new Date(String(source));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const normalizeTarget = (value) => {
  if (!value || typeof value !== 'string') return 'Toàn trường';
  return value.trim() || 'Toàn trường';
};

const normalizeSender = (value) => {
  if (!value || typeof value !== 'string') return 'Admin';
  return value.trim() || 'Admin';
};

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
        type: announcement.type ?? "general",
        sender: normalizeSender(announcement.sender),
        target: normalizeTarget(announcement.target),
        allowReply: resolveAllowReply(announcement),
        replyUntil: normalizeReplyUntil(announcement),
        history: ThongBaoModel.normalizeHistory(announcement.history),
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

      const numericId = Number(id);

      const announcement = await ThongBaoModel.getAnnouncementById(numericId);

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
        type: announcement.type ?? "general",
        sender: normalizeSender(announcement.sender),
        target: normalizeTarget(announcement.target),
        allowReply: resolveAllowReply(announcement),
        replyUntil: normalizeReplyUntil(announcement),
        history: ThongBaoModel.normalizeHistory(announcement.history),
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

      console.log("📦 Student from DB:", student);

      // Format dữ liệu trả về
      const formattedStudent = {
        student_id: student.student_id,
        full_name: student.full_name,
        course: student.course,
        classes: student.classes ? student.classes.split(',').map(cls => cls.trim()) : [],
        avatar_url: student.avatar_url || "/avatar.png" // ✅ Thêm avatar_url
      };
      
      console.log("📤 Sending student data:", formattedStudent);
      
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
        classes: student.classes ? student.classes.split(',').map(cls => cls.trim()) : [],
        avatar_url: student.avatar_url || "/avatar.png" // ✅ Thêm avatar_url
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

  // API gửi phản hồi cho thông báo
  static async addReply(req, res) {
    try {
      const { id } = req.params;
      const { message } = req.body ?? {};

      const announcementId = Number(id);
      if (!id || Number.isNaN(announcementId)) {
        return res.status(400).json({
          success: false,
          message: "ID thông báo không hợp lệ",
        });
      }

      const trimmedMessage = typeof message === 'string' ? message.trim() : '';
      if (!trimmedMessage) {
        return res.status(400).json({
          success: false,
          message: "Nội dung phản hồi không được để trống",
        });
      }

      const announcement = await ThongBaoModel.getAnnouncementById(announcementId);
      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông báo",
        });
      }

      if (!resolveAllowReply(announcement)) {
        return res.status(403).json({
          success: false,
          message: "Thông báo này không cho phép phản hồi",
        });
      }

      const replyDeadline = normalizeReplyUntil(announcement);
      if (replyDeadline && new Date(replyDeadline).getTime() < Date.now()) {
        return res.status(403).json({
          success: false,
          message: "Thời hạn phản hồi đã kết thúc",
        });
      }

      const actor = req.user ?? {};
      const record = await ThongBaoModel.addReply(announcementId, {
        message: trimmedMessage,
        authorId: actor.user_code ?? actor.userCode ?? actor.id ?? null,
        authorName: actor.fullName ?? actor.name ?? 'Người dùng',
        authorEmail: actor.email ?? null,
        source: actor.role ?? 'unknown',
        metadata: {
          role: actor.role ?? null,
        },
      });

      return res.status(201).json({
        success: true,
        data: record,
        message: "Gửi phản hồi thành công",
      });
    } catch (error) {
      console.error('Error in addReply:', error);
      return res.status(500).json({
        success: false,
        message: "Lỗi hệ thống. Không thể gửi phản hồi.",
        error: error.message,
      });
    }
  }
}

module.exports = ThongBaoController;

