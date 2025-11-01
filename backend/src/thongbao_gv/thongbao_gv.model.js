const prisma = require('../config/prisma');

class ThongBaoGVModel {
  // Lấy danh sách thông báo cho giảng viên (chỉ lấy category = 'giangvien')
  static async getAllAnnouncementsForTeacher() {
    try {
      const announcements = await prisma.$queryRaw`
        SELECT
          id,
          title,
          content,
          sender,
          target,
          category,
          type,
          status,
          allow_reply,
          reply_until,
          created_at,
          updated_at
        FROM announcements
        WHERE category = 'giangvien'
        ORDER BY created_at DESC
      `;
      return announcements;
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách thông báo: ${error.message}`);
    }
  }

  // Lấy chi tiết thông báo theo ID cho giảng viên (chỉ lấy category = 'giangvien')
  static async getAnnouncementByIdForTeacher(id) {
    try {
      const announcements = await prisma.$queryRaw`
        SELECT
          id,
          title,
          content,
          sender,
          target,
          category,
          type,
          status,
          allow_reply,
          reply_until,
          created_at,
          updated_at
        FROM announcements
        WHERE id = ${id} AND category = 'giangvien'
      `;
      return announcements[0] || null;
    } catch (error) {
      throw new Error(`Lỗi khi lấy chi tiết thông báo: ${error.message}`);
    }
  }
}

module.exports = ThongBaoGVModel;

