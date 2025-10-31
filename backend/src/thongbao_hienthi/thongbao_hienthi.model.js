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
          recipients,
          history,
          created_at,
          updated_at
        FROM announcements
        ORDER BY created_at DESC
      `;
      return announcements;
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách thông báo: ${error.message}`);
    }
  }

  // Lấy chi tiết thông báo theo ID
  static async getAnnouncementById(id) {
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
          recipients,
          history,
          created_at,
          updated_at
        FROM announcements
        WHERE id = ${id}
      `;
      return announcements[0] || null;
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
    const announcement = await prisma.announcements.findUnique({
      where: { id: announcementId },
      select: { history: true },
    });

    if (!announcement) {
      return null;
    }

    const historyList = normalizeHistoryValue(announcement.history);
    const replyRecord = {
      type: 'reply',
      id: reply.id ?? `reply-${Date.now().toString(36)}`,
      message: reply.message,
      createdAt: reply.createdAt ?? new Date().toISOString(),
      authorId: reply.authorId ?? null,
      authorName: reply.authorName ?? 'Sinh viên',
      authorEmail: reply.authorEmail ?? null,
      source: reply.source ?? 'student',
      metadata: reply.metadata ?? null,
    };

    historyList.push(replyRecord);

    await prisma.announcements.update({
      where: { id: announcementId },
      data: {
        history: historyList,
        updated_at: new Date(),
      },
    });

    return replyRecord;
  }
}

module.exports = ThongBaoModel;

