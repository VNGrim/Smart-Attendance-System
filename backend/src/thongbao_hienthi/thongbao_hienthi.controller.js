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

const formatReply = (row) => {
  if (!row) return null;
  const createdAt = row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt ?? null;
  const readAt = row.readAt instanceof Date ? row.readAt.toISOString() : row.readAt ?? null;
  const author = row.author
    ? {
        type: row.author.type ?? null,
        code: row.author.code ?? null,
        name: row.author.name ?? null,
        class: row.author.class ?? null,
        subject: row.author.subject ?? null,
      }
    : null;

  return {
    id: row.id,
    announcementId: row.announcementId,
    content: row.content,
    createdAt,
    readAt,
    author,
    metadata: row.metadata ?? null,
  };
};

class ThongBaoController {
  static formatAnnouncement(record) {
    return {
      id: record.id,
      title: record.title,
      content: record.content,
      created_at: record.created_at,
      date: record.created_at?.toISOString().split('T')[0] ?? null,
      type: record.type ?? 'general',
      sender: normalizeSender(record.sender),
      target: normalizeTarget(record.target),
      allowReply: resolveAllowReply(record),
      replyUntil: normalizeReplyUntil(record),
    };
  }

  static async resolveActorFromRequest(req) {
    const actor = req.user ?? {};
    if (actor.role === 'student') {
      const student = await ThongBaoModel.getStudentByAccount(actor.user_code ?? actor.userCode ?? null);
      return {
        type: 'student',
        identifier: student?.student_id ?? actor.user_code ?? null,
        name: student?.full_name ?? actor.fullName ?? 'Sinh viên',
        class: student?.classes ?? null,
      };
    }
    if (actor.role === 'teacher') {
      const teacher = await ThongBaoModel.getTeacherByAccount(actor.user_code ?? actor.userCode ?? null);
      return {
        type: 'teacher',
        identifier: teacher?.teacher_id ?? actor.user_code ?? null,
        name: teacher?.full_name ?? actor.fullName ?? 'Giảng viên',
        subject: teacher?.subject ?? null,
      };
    }
    return {
      type: 'unknown',
      identifier: actor.user_code ?? actor.userCode ?? null,
      name: actor.fullName ?? actor.name ?? 'Người dùng',
    };
  }

  // API lấy danh sách thông báo
  static async getAllAnnouncements(req, res) {
    try {
      const actor = await ThongBaoController.resolveActorFromRequest(req);
      const announcements = await ThongBaoModel.getAllAnnouncements();

      const filtered = announcements.filter((item) => {
        const target = normalizeTarget(item.target).toLowerCase();
        if (actor.type === 'student') {
          return target.includes('sinh') || target.includes('toàn');
        }
        if (actor.type === 'teacher') {
          if (target.includes('giảng') || target.includes('toàn')) return true;
          if (Array.isArray(item.recipients) && actor.identifier) {
            return item.recipients.includes(actor.identifier);
          }
          return false;
        }
        return true;
      });

      const formatted = filtered.map(ThongBaoController.formatAnnouncement);

      res.json({
        success: true,
        data: formatted,
        message: 'Lấy danh sách thông báo thành công',
      });
    } catch (error) {
      console.error('Error in getAllAnnouncements:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống. Không thể lấy danh sách thông báo.',
        error: error.message,
      });
    }
  }

  // API lấy chi tiết thông báo theo ID
  static async getAnnouncementById(req, res) {
    try {
      const { id } = req.params;
      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({ success: false, message: 'ID thông báo không hợp lệ' });
      }

      const announcement = await ThongBaoModel.getAnnouncementById(Number(id));
      if (!announcement) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      }

      const formattedAnnouncement = ThongBaoController.formatAnnouncement(announcement);

      res.json({
        success: true,
        data: formattedAnnouncement,
        message: 'Lấy chi tiết thông báo thành công',
      });
    } catch (error) {
      console.error('Error in getAnnouncementById:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống. Không thể lấy chi tiết thông báo.',
        error: error.message,
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
        classes: student.classes ? student.classes.split(',').map((cls) => cls.trim()) : [],
        avatar_url: student.avatar_url || "/avatar.png",
      };

      res.json({
        success: true,
        data: formattedStudent,
        message: "Lấy thông tin sinh viên thành công",
      });
    } catch (error) {
      console.error("Error in getStudentByUserCode:", error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống. Không thể lấy thông tin sinh viên.',
        error: error.message
      });
    }
  }

  static async getReplies(req, res) {
    try {
      const { id } = req.params;
      const announcementId = Number(id);
      if (!id || Number.isNaN(announcementId)) {
        return res.status(400).json({ success: false, message: 'ID thông báo không hợp lệ' });
      }

      const announcement = await ThongBaoModel.getAnnouncementById(announcementId);
      if (!announcement) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      }

      const { authorType, authorCode, unreadOnly } = req.query ?? {};
      const options = {};
      if (authorType) options.authorType = String(authorType);
      if (authorCode) options.authorCode = String(authorCode);
      if (typeof unreadOnly === 'string' && unreadOnly.toLowerCase() === 'true') {
        options.onlyUnread = true;
      }

      const replies = await ThongBaoModel.getRepliesByAnnouncement(announcementId, options);
      const formatted = replies.map((reply) => formatReply(reply)).filter(Boolean);

      return res.json({
        success: true,
        data: formatted,
        message: 'Lấy danh sách phản hồi thành công',
      });
    } catch (error) {
      console.error('Error in getReplies:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống. Không thể lấy phản hồi.',
        error: error.message,
      });
    }
  }

  static async getMyReplies(req, res) {
    try {
      const { id } = req.params;
      const announcementId = Number(id);
      if (!id || Number.isNaN(announcementId)) {
        return res.status(400).json({ success: false, message: 'ID thông báo không hợp lệ' });
      }

      const actor = await ThongBaoController.resolveActorFromRequest(req);
      if (!actor.identifier) {
        return res.status(403).json({ success: false, message: 'Không xác định được người dùng' });
      }

      const announcement = await ThongBaoModel.getAnnouncementById(announcementId);
      if (!announcement) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      }

      const replies = await ThongBaoModel.getRepliesByAnnouncement(announcementId, {
        authorCode: actor.identifier,
        authorType: actor.type,
      });

      const formatted = replies.map((reply) => formatReply(reply)).filter(Boolean);

      return res.json({
        success: true,
        data: formatted,
        message: 'Lấy phản hồi của bạn thành công',
      });
    } catch (error) {
      console.error('Error in getMyReplies:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống. Không thể lấy phản hồi của bạn.',
        error: error.message,
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

      const actor = await ThongBaoController.resolveActorFromRequest(req);

      const record = await ThongBaoModel.addReply(announcementId, {
        message: trimmedMessage,
        authorType: actor.type,
        authorCode: actor.identifier,
        authorName: actor.name,
        authorClass: actor.class ?? null,
        authorSubject: actor.subject ?? null,
        metadata: {
          role: actor.type,
        },
      });

      return res.status(201).json({
        success: true,
        data: record,
        message: 'Gửi phản hồi thành công',
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

