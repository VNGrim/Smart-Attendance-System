const ThongBaoModel = require('../thongbao_hienthi/thongbao_hienthi.model');
const prisma = require('../config/prisma');

const normalizeBoolean = (value) => {
  if (value == null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(trimmed)) return true;
    if (['false', '0', 'no'].includes(trimmed)) return false;
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'boolean') return parsed;
      return normalizeBoolean(parsed);
    } catch {
      if (trimmed.includes('allowreply:true') || trimmed.includes('allow_reply":true')) return true;
      if (trimmed.includes('allowreply:false') || trimmed.includes('allow_reply":false')) return false;
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

const canTeacherAccess = (record, teacher) => {
  if (!record) return false;
  const target = normalizeTarget(record.target).toLowerCase();
  if (target.includes('giảng') || target.includes('giang') || target.includes('teacher')) return true;
  if (target.includes('toàn') || target.includes('all')) return true;
  if (!teacher?.identifier) return false;
  const recipients = Array.isArray(record.recipients) ? record.recipients.map((item) => String(item)) : [];
  return recipients.includes(String(teacher.identifier));
};

const formatAnnouncement = (record) => {
  const createdAt = record.created_at ? new Date(record.created_at) : null;
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    sender: normalizeSender(record.sender),
    date: record.created_at ?? null,
    dateFormatted: createdAt
      ? createdAt.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
      : '',
    time: createdAt ? createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
    type: record.type || 'Khác',
    status: record.status || 'Đã gửi',
    category: record.category || 'general',
    allowReply: resolveAllowReply(record),
    replyUntil: normalizeReplyUntil(record),
  };
};

const resolveTeacherFromRequest = async (req) => {
  const actor = req.user ?? {};
  const teacher = await ThongBaoModel.getTeacherByAccount(actor.user_code ?? actor.userCode ?? null);
  return {
    type: 'teacher',
    identifier: teacher?.teacher_id ?? actor.user_code ?? null,
    name: teacher?.full_name ?? actor.fullName ?? 'Giảng viên',
    subject: teacher?.subject ?? null,
    classes: teacher?.classes ?? null,
  };
};

class ThongBaoGVController {
  static async getActiveClasses(req, res) {
    try {
      const actor = req.user ?? {};
      const teacher = await ThongBaoModel.getTeacherByAccount(actor.user_code ?? actor.userCode ?? null);
      const teacherId = teacher?.teacher_id;
      if (!teacherId) {
        return res.status(401).json({ success: false, message: 'Không xác định được giảng viên' });
      }
      const rows = await prisma.$queryRaw`
        SELECT class_id, class_name, subject_name, status
        FROM classes
        WHERE teacher_id = ${teacherId} AND status = 'Đang hoạt động'
        ORDER BY class_name ASC
      `;
      const data = rows.map(r => ({ id: r.class_id, name: r.class_name, subjectName: r.subject_name }));
      return res.json({ success: true, data });
    } catch (error) {
      console.error('getActiveClasses error:', error);
      return res.status(500).json({ success: false, message: 'Không thể tải danh sách lớp', detail: error?.message });
    }
  }

  static async createAnnouncement(req, res) {
    try {
      const actor = req.user ?? {};
      const teacher = await ThongBaoModel.getTeacherByAccount(actor.user_code ?? actor.userCode ?? null);
      const teacherId = teacher?.teacher_id;
      const teacherName = teacher?.full_name || actor.fullName || 'Giảng viên';
      if (!teacherId) {
        return res.status(401).json({ success: false, message: 'Không xác định được giảng viên' });
      }

      const body = req.body || {};
      const classId = String(body.classId || body.class_id || '').trim();
      const title = String(body.title || '').trim();
      const content = String(body.content || '').trim();
      const allowReply = normalizeBoolean(body.allowReply) ?? false;
      const replyUntil = body.replyUntil ? new Date(body.replyUntil) : null;

      if (!classId || !title || !content) {
        return res.status(400).json({ success: false, message: 'Thiếu lớp, tiêu đề hoặc nội dung' });
      }

      // verify teacher owns class
      const owns = await prisma.$queryRaw`SELECT 1 FROM classes WHERE class_id = ${classId} AND (teacher_id = ${teacherId} OR teacher_id IS NULL) LIMIT 1`;
      if (!owns || !owns.length) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền gửi thông báo cho lớp này' });
      }

      // handle attachment
      let attachments = [];
      if (req.file) {
        const url = `/uploads/${req.file.filename}`;
        attachments.push({ filename: req.file.originalname, stored: req.file.filename, url, size: req.file.size });
      }

      const historyEntry = { action: 'created', by: 'teacher', teacherId, classId, allowReply, attachments };

      const created = await prisma.announcements.create({
        data: {
          title,
          content,
          sender: teacherName,
          target: classId,
          category: 'class',
          type: 'Giảng viên',
          status: 'Đã gửi',
          send_time: new Date(),
          allow_reply: allowReply,
          reply_until: replyUntil || undefined,
          recipients: [classId],
          history: [historyEntry],
        },
      });

      return res.status(201).json({ success: true, data: { id: created.id } });
    } catch (error) {
      console.error('createAnnouncement error:', error);
      return res.status(500).json({ success: false, message: 'Không thể gửi thông báo', detail: error?.message });
    }
  }
  static async getAllAnnouncements(req, res) {
    try {
      const teacher = await resolveTeacherFromRequest(req);
      const announcements = await ThongBaoModel.getAllAnnouncements();

      const filtered = announcements.filter((record) => canTeacherAccess(record, teacher));
      const formatted = filtered.map(formatAnnouncement);

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

  static async getAnnouncementById(req, res) {
    try {
      const { id } = req.params;
      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({ success: false, message: 'ID thông báo không hợp lệ' });
      }

      const teacher = await resolveTeacherFromRequest(req);
      const announcement = await ThongBaoModel.getAnnouncementById(Number(id));

      if (!announcement) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      }

      if (!canTeacherAccess(announcement, teacher)) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem thông báo này' });
      }

      const formatted = formatAnnouncement(announcement);

      res.json({
        success: true,
        data: formatted,
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

  static async addReply(req, res) {
    try {
      const { id } = req.params;
      const { message } = req.body ?? {};

      const announcementId = Number(id);
      if (!id || Number.isNaN(announcementId)) {
        return res.status(400).json({ success: false, message: 'ID thông báo không hợp lệ' });
      }

      const trimmedMessage = typeof message === 'string' ? message.trim() : '';
      if (!trimmedMessage) {
        return res.status(400).json({ success: false, message: 'Nội dung phản hồi không được để trống' });
      }

      const teacher = await resolveTeacherFromRequest(req);
      if (!teacher.identifier) {
        return res.status(403).json({ success: false, message: 'Tài khoản giảng viên không hợp lệ' });
      }

      const announcement = await ThongBaoModel.getAnnouncementById(announcementId);
      if (!announcement) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      }

      if (!canTeacherAccess(announcement, teacher)) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền phản hồi thông báo này' });
      }

      if (!resolveAllowReply(announcement)) {
        return res.status(403).json({ success: false, message: 'Thông báo này không cho phép phản hồi' });
      }

      const replyDeadline = normalizeReplyUntil(announcement);
      if (replyDeadline && new Date(replyDeadline).getTime() < Date.now()) {
        return res.status(403).json({ success: false, message: 'Thời hạn phản hồi đã kết thúc' });
      }

      const record = await ThongBaoModel.addReply(announcementId, {
        message: trimmedMessage,
        authorType: 'teacher',
        authorCode: teacher.identifier,
        authorName: teacher.name,
        authorSubject: teacher.subject ?? null,
        authorClass: teacher.classes ?? null,
        metadata: { role: 'teacher' },
      });

      return res.status(201).json({
        success: true,
        data: record,
        message: 'Gửi phản hồi thành công',
      });
    } catch (error) {
      console.error('Error in addReply (teacher):', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống. Không thể gửi phản hồi.',
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

      const teacher = await resolveTeacherFromRequest(req);
      if (!teacher.identifier) {
        return res.status(403).json({ success: false, message: 'Tài khoản giảng viên không hợp lệ' });
      }

      const announcement = await ThongBaoModel.getAnnouncementById(announcementId);
      if (!announcement) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      }

      if (!canTeacherAccess(announcement, teacher)) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem phản hồi này' });
      }

      const replies = await ThongBaoModel.getRepliesByAnnouncement(announcementId, {
        authorType: 'teacher',
        authorCode: teacher.identifier,
      });

      return res.json({ success: true, data: replies });
    } catch (error) {
      console.error('Error in getMyReplies (teacher):', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống. Không thể lấy phản hồi.',
        error: error.message,
      });
    }
  }
}

module.exports = ThongBaoGVController;

