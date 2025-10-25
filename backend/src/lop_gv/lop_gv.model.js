const db = require('../config/db');

class LopModel {
  // Lấy danh sách lớp học của giảng viên
  static async getClassesByTeacher(teacherId) {
    try {
      const [classes] = await db.execute(
        `SELECT 
          c.class_id,
          c.class_name,
          c.subject_name,
          c.semester,
          c.school_year,
          COUNT(DISTINCT sc.student_id) as student_count
        FROM classes c
        LEFT JOIN student_classes sc ON c.class_id = sc.class_id
        WHERE c.teacher_id = ?
        GROUP BY c.class_id, c.class_name, c.subject_name, c.semester, c.school_year
        ORDER BY c.school_year DESC, c.semester DESC, c.class_name`,
        [teacherId]
      );
      return classes;
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách lớp học: ${error.message}`);
    }
  }

  // Lấy chi tiết lớp học theo class_id
  static async getClassById(classId) {
    try {
      const [classes] = await db.execute(
        `SELECT 
          c.class_id,
          c.class_name,
          c.subject_name,
          c.semester,
          c.school_year,
          c.room,
          c.schedule,
          c.description,
          t.full_name as teacher_name,
          t.teacher_id
        FROM classes c
        LEFT JOIN teachers t ON c.teacher_id = t.teacher_id
        WHERE c.class_id = ?`,
        [classId]
      );
      return classes[0] || null;
    } catch (error) {
      throw new Error(`Lỗi khi lấy chi tiết lớp học: ${error.message}`);
    }
  }

  // Lấy danh sách sinh viên trong lớp
  static async getStudentsInClass(classId) {
    try {
      const [students] = await db.execute(
        `SELECT 
          s.student_id,
          s.full_name,
          s.email,
          s.phone,
          s.course,
          sc.enrolled_at,
          sc.status
        FROM students s
        JOIN student_classes sc ON s.student_id = sc.student_id
        WHERE sc.class_id = ?
        ORDER BY s.full_name`,
        [classId]
      );
      return students;
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách sinh viên trong lớp: ${error.message}`);
    }
  }

  // Lấy thông tin giảng viên theo teacher_id
  static async getTeacherInfo(teacherId) {
    try {
      const [teachers] = await db.execute(
        `SELECT 
          teacher_id,
          full_name,
          email,
          phone,
          department
        FROM teachers 
        WHERE teacher_id = ?`,
        [teacherId]
      );
      return teachers[0] || null;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông tin giảng viên: ${error.message}`);
    }
  }

  // Lấy thông tin giảng viên từ account
  static async getTeacherByAccount(userCode) {
    try {
      const [teachers] = await db.execute(
        `SELECT 
          t.teacher_id,
          t.full_name,
          t.email,
          t.phone,
          t.department
        FROM teachers t
        JOIN accounts a ON t.account_id = a.id
        WHERE a.user_code = ?`,
        [userCode]
      );
      return teachers[0] || null;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông tin giảng viên từ account: ${error.message}`);
    }
  }

  // Lấy thông báo của lớp học
  static async getClassAnnouncements(classId) {
    try {
      const [announcements] = await db.execute(
        `SELECT 
          id,
          title,
          content,
          created_at,
          updated_at
        FROM class_announcements 
        WHERE class_id = ?
        ORDER BY created_at DESC`,
        [classId]
      );
      return announcements;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông báo lớp học: ${error.message}`);
    }
  }

  // Tạo thông báo mới cho lớp
  static async createClassAnnouncement(classId, title, content, teacherId) {
    try {
      const [result] = await db.execute(
        `INSERT INTO class_announcements (class_id, title, content, teacher_id, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [classId, title, content, teacherId]
      );
      return result.insertId;
    } catch (error) {
      throw new Error(`Lỗi khi tạo thông báo lớp học: ${error.message}`);
    }
  }
}

module.exports = LopModel;
