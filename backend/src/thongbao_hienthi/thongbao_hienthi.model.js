const db = require('../config/db');

class ThongBaoModel {
  // Lấy danh sách tất cả thông báo
  static async getAllAnnouncements() {
    try {
      const [announcements] = await db.execute(
        "SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC"
      );
      return announcements;
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách thông báo: ${error.message}`);
    }
  }

  // Lấy chi tiết thông báo theo ID
  static async getAnnouncementById(id) {
    try {
      const [announcements] = await db.execute(
        "SELECT id, title, content, created_at FROM announcements WHERE id = ?",
        [id]
      );
      return announcements[0] || null;
    } catch (error) {
      throw new Error(`Lỗi khi lấy chi tiết thông báo: ${error.message}`);
    }
  }

  // Lấy thông tin sinh viên theo student_id
  static async getStudentInfo(studentId) {
    try {
      const [students] = await db.execute(
        "SELECT student_id, full_name, course, classes FROM students WHERE student_id = ?",
        [studentId]
      );
      return students[0] || null;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông tin sinh viên: ${error.message}`);
    }
  }

  // Lấy thông tin sinh viên từ account
  static async getStudentByAccount(userCode) {
    try {
      const [students] = await db.execute(
        `SELECT s.student_id, s.full_name, s.course, s.classes 
         FROM students s 
         JOIN accounts a ON s.account_id = a.id 
         WHERE a.user_code = ?`,
        [userCode]
      );
      return students[0] || null;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông tin sinh viên từ account: ${error.message}`);
    }
  }
}

module.exports = ThongBaoModel;

