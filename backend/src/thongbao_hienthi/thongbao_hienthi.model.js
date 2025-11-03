const prisma = require('../config/prisma');

const normalizeHistoryValue = (value) => {
  if (value == null) return [];
  if (Array.isArray(value)) return [...value];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return [...parsed];
      if (parsed != null) return [parsed];
      return [];
    } catch {
      return [value];
    }
  }
  if (typeof value === 'object') {
    return [value];
  }
  return [];
};

class ThongBaoModel {
  // Lấy danh sách tất cả thông báo
  static async getAllAnnouncements() {
    try {
      const announcements = await prisma.$queryRaw`
        SELECT
          id,
          COALESCE(code, CONCAT('ANN-', id)) AS code,
          title,
          content,
          sender,
          target,
          category,
          type,
          status,
          send_time,
          scheduled_at,
          allow_reply,
          reply_until,
          recipients,
          history,
          created_at,
          updated_at
        FROM announcements
        ORDER BY created_at DESC
      `;
      return announcements.map((record) => ({
        ...record,
        recipients: ThongBaoModel.normalizeRecipients(record.recipients),
        history: ThongBaoModel.normalizeHistory(record.history),
      }));
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách thông báo: ${error.message}`);
    }
  }

  // Lấy chi tiết thông báo theo ID
  static async getAnnouncementById(id) {
    try {
      const numericId = Number(id);
      if (Number.isNaN(numericId)) {
        throw new Error('Invalid announcement id');
      }
      const rows = await prisma.$queryRaw`
        SELECT
          id,
          COALESCE(code, CONCAT('ANN-', id)) AS code,
          title,
          content,
          sender,
          target,
          category,
          type,
          status,
          send_time,
          scheduled_at,
          allow_reply,
          reply_until,
          recipients,
          history,
          created_at,
          updated_at
        FROM announcements
        WHERE id = CAST(${numericId} AS INTEGER)
      `;

      const record = rows[0];
      if (!record) {
        return null;
      }

      return {
        ...record,
        recipients: ThongBaoModel.normalizeRecipients(record.recipients),
        history: ThongBaoModel.normalizeHistory(record.history),
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy chi tiết thông báo: ${error.message}`);
    }
  }

  // Lấy thông tin sinh viên theo student_id
  static async getStudentInfo(studentId) {
    try {
      const students = await prisma.$queryRaw`
        SELECT student_id, full_name, course, classes, avatar_url
        FROM students 
        WHERE student_id = ${studentId}
      `;
      return students[0] || null;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông tin sinh viên: ${error.message}`);
    }
  }

  // Lấy thông tin sinh viên từ account
  static async getStudentByAccount(userCode) {
    try {
      const students = await prisma.$queryRaw`
        SELECT s.student_id, s.full_name, s.course, s.classes, s.avatar_url
        FROM students s 
        JOIN accounts a ON s.account_id = a.id 
        WHERE a.user_code = ${userCode}
      `;
      return students[0] || null;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông tin sinh viên từ account: ${error.message}`);
    }
  }

  static async addReply(announcementId, reply) {
    const created = await prisma.announcement_replies.create({
      data: {
        announcement_id: announcementId,
        author_type: reply.authorType,
        author_code: reply.authorCode ?? null,
        author_name: reply.authorName ?? null,
        author_class: reply.authorClass ?? null,
        author_subject: reply.authorSubject ?? null,
        content: reply.message,
        metadata: reply.metadata ?? null,
      },
    });

    return ThongBaoModel.formatReplyRow(created);
  }

  static async getRepliesByAnnouncement(announcementId, options = {}) {
    const where = {
      announcement_id: announcementId,
    };

    if (options.authorCode) {
      where.author_code = options.authorCode;
    }

    if (options.authorType) {
      where.author_type = options.authorType;
    }

    if (options.onlyUnread) {
      where.read_at = null;
    }

    const rows = await prisma.announcement_replies.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return rows.map((row) => ThongBaoModel.formatReplyRow(row));
  }

  static async markRepliesAsRead(announcementId, replyIds = null) {
    const where = {
      announcement_id: announcementId,
    };

    if (Array.isArray(replyIds) && replyIds.length) {
      where.id = { in: replyIds };
    }

    const result = await prisma.announcement_replies.updateMany({
      where,
      data: { read_at: new Date() },
    });

    return result.count;
  }

  static async getTeacherByAccount(userCode) {
    try {
      const teachers = await prisma.$queryRaw`
        SELECT t.teacher_id, t.full_name, t.subject, t.classes
        FROM teachers t
        JOIN accounts a ON t.account_id = a.id
        WHERE a.user_code = ${userCode}
      `;
      return teachers[0] || null;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông tin giảng viên từ account: ${error.message}`);
    }
  }

  static normalizeHistory(history) {
    return normalizeHistoryValue(history);
  }

  static normalizeRecipients(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((item) => (item == null ? null : String(item).trim()))
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => (item == null ? null : String(item).trim()))
            .filter(Boolean);
        }
      } catch {
        return value
          .split(/[;,]/)
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
    if (typeof value === 'object') {
      return Object.values(value)
        .map((item) => (item == null ? null : String(item).trim()))
        .filter(Boolean);
    }
    return [];
  }

  static formatReplyRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      announcementId: row.announcement_id,
      content: row.content,
      createdAt: row.created_at,
      readAt: row.read_at,
      author: {
        type: row.author_type,
        code: row.author_code,
        name: row.author_name,
        class: row.author_class,
        subject: row.author_subject,
      },
      metadata: row.metadata ?? null,
    };
  }
}

module.exports = ThongBaoModel;

