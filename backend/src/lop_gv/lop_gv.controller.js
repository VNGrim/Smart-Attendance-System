const LopModel = require('./lop_gv.model');

class LopController {
  // API lấy danh sách lớp học của giảng viên
  static async getTeacherClasses(req, res) {
    try {
      const { teacherId } = req.params;
      
      // Validate teacherId
      if (!teacherId) {
        return res.status(400).json({
          success: false,
          message: "Mã giảng viên không được để trống"
        });
      }

      const classes = await LopModel.getClassesByTeacher(teacherId);
      
      // Format dữ liệu trả về
      const formattedClasses = classes.map(cls => ({
        class_id: cls.class_id,
        class_name: cls.class_name,
        subject_name: cls.subject_name,
        semester: cls.semester,
        school_year: cls.school_year,
        student_count: cls.student_count || 0
      }));
      
      res.json({
        success: true,
        data: formattedClasses,
        message: "Lấy danh sách lớp học thành công"
      });
    } catch (error) {
      console.error("Error in getTeacherClasses:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi hệ thống. Không thể lấy danh sách lớp học.",
        error: error.message
      });
    }
  }

  // API lấy chi tiết lớp học
  static async getClassDetails(req, res) {
    try {
      const { classId } = req.params;
      
      // Validate classId
      if (!classId) {
        return res.status(400).json({
          success: false,
          message: "Mã lớp học không được để trống"
        });
      }

      const classDetails = await LopModel.getClassById(classId);
      
      if (!classDetails) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lớp học"
        });
      }

      // Format dữ liệu trả về
      const formattedClass = {
        class_id: classDetails.class_id,
        class_name: classDetails.class_name,
        subject_name: classDetails.subject_name,
        semester: classDetails.semester,
        school_year: classDetails.school_year,
        room: classDetails.room,
        schedule: classDetails.schedule,
        description: classDetails.description,
        teacher_name: classDetails.teacher_name,
        teacher_id: classDetails.teacher_id
      };
      
      res.json({
        success: true,
        data: formattedClass,
        message: "Lấy chi tiết lớp học thành công"
      });
    } catch (error) {
      console.error("Error in getClassDetails:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi hệ thống. Không thể lấy chi tiết lớp học.",
        error: error.message
      });
    }
  }

  // API lấy danh sách sinh viên trong lớp
  static async getClassStudents(req, res) {
    try {
      const { classId } = req.params;
      
      // Validate classId
      if (!classId) {
        return res.status(400).json({
          success: false,
          message: "Mã lớp học không được để trống"
        });
      }

      const students = await LopModel.getStudentsInClass(classId);
      
      // Format dữ liệu trả về
      const formattedStudents = students.map(student => ({
        student_id: student.student_id,
        full_name: student.full_name,
        email: student.email,
        phone: student.phone,
        course: student.course,
        enrolled_at: student.enrolled_at,
        status: student.status
      }));
      
      res.json({
        success: true,
        data: formattedStudents,
        message: "Lấy danh sách sinh viên thành công"
      });
    } catch (error) {
      console.error("Error in getClassStudents:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi hệ thống. Không thể lấy danh sách sinh viên.",
        error: error.message
      });
    }
  }

  // API lấy thông tin giảng viên
  static async getTeacherInfo(req, res) {
    try {
      const { teacherId } = req.params;
      
      // Validate teacherId
      if (!teacherId) {
        return res.status(400).json({
          success: false,
          message: "Mã giảng viên không được để trống"
        });
      }

      const teacher = await LopModel.getTeacherInfo(teacherId);
      
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông tin giảng viên"
        });
      }

      // Format dữ liệu trả về
      const formattedTeacher = {
        teacher_id: teacher.teacher_id,
        full_name: teacher.full_name,
        email: teacher.email,
        phone: teacher.phone,
        department: teacher.department
      };
      
      res.json({
        success: true,
        data: formattedTeacher,
        message: "Lấy thông tin giảng viên thành công"
      });
    } catch (error) {
      console.error("Error in getTeacherInfo:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi hệ thống. Không thể lấy thông tin giảng viên.",
        error: error.message
      });
    }
  }

  // API lấy thông tin giảng viên từ user_code
  static async getTeacherByUserCode(req, res) {
    try {
      const { userCode } = req.params;
      
      // Validate userCode
      if (!userCode) {
        return res.status(400).json({
          success: false,
          message: "Mã đăng nhập không được để trống"
        });
      }

      const teacher = await LopModel.getTeacherByAccount(userCode);
      
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông tin giảng viên"
        });
      }

      // Format dữ liệu trả về
      const formattedTeacher = {
        teacher_id: teacher.teacher_id,
        full_name: teacher.full_name,
        email: teacher.email,
        phone: teacher.phone,
        department: teacher.department
      };
      
      res.json({
        success: true,
        data: formattedTeacher,
        message: "Lấy thông tin giảng viên thành công"
      });
    } catch (error) {
      console.error("Error in getTeacherByUserCode:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi hệ thống. Không thể lấy thông tin giảng viên.",
        error: error.message
      });
    }
  }

  // API lấy thông báo của lớp học
  static async getClassAnnouncements(req, res) {
    try {
      const { classId } = req.params;
      
      // Validate classId
      if (!classId) {
        return res.status(400).json({
          success: false,
          message: "Mã lớp học không được để trống"
        });
      }

      const announcements = await LopModel.getClassAnnouncements(classId);
      
      // Format dữ liệu trả về
      const formattedAnnouncements = announcements.map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        created_at: announcement.created_at,
        updated_at: announcement.updated_at,
        date: announcement.created_at.toISOString().split('T')[0]
      }));
      
      res.json({
        success: true,
        data: formattedAnnouncements,
        message: "Lấy thông báo lớp học thành công"
      });
    } catch (error) {
      console.error("Error in getClassAnnouncements:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi hệ thống. Không thể lấy thông báo lớp học.",
        error: error.message
      });
    }
  }

  // API tạo thông báo mới cho lớp
  static async createClassAnnouncement(req, res) {
    try {
      const { classId } = req.params;
      const { title, content, teacherId } = req.body;
      
      // Validate input
      if (!classId || !title || !content || !teacherId) {
        return res.status(400).json({
          success: false,
          message: "Thiếu thông tin bắt buộc"
        });
      }

      const announcementId = await LopModel.createClassAnnouncement(classId, title, content, teacherId);
      
      res.json({
        success: true,
        data: { id: announcementId },
        message: "Tạo thông báo thành công"
      });
    } catch (error) {
      console.error("Error in createClassAnnouncement:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi hệ thống. Không thể tạo thông báo.",
        error: error.message
      });
    }
  }
}

module.exports = LopController;
