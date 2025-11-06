const prisma = require('../config/prisma');
const dayjs = require('dayjs');

class LopController {
  // API lấy danh sách lớp học của giảng viên
  static async getTeacherClasses(req, res) {
    try {
      const teacherId = req.user?.userId;
      
      if (!teacherId) {
        return res.status(401).json({
          success: false,
          message: 'Không xác định được giảng viên'
        });
      }

      await prisma.$ready;

      const classes = await prisma.classes.findMany({
        where: {
          teacher_id: teacherId,
          status: 'Đang hoạt động'
        },
        select: {
          class_id: true,
          class_name: true,
          subject_code: true,
          subject_name: true,
          room: true,
          schedule: true,
          cohort: true,
          semester: true,
          school_year: true
        },
        orderBy: {
          class_id: 'asc'
        }
      });

      // Lấy thông tin lịch học và số sinh viên cho từng lớp
      const classesWithDetails = await Promise.all(
        classes.map(async (cls) => {
          // Lấy lịch học đầu tiên
          const firstSchedule = await prisma.timetable.findFirst({
            where: { classes: cls.class_id },
            include: { time_slots: true },
            orderBy: [
              { day_of_week: 'asc' },
              { slot_id: 'asc' }
            ]
          });

          const dayNames = {
            Mon: 'Thứ 2', Tue: 'Thứ 3', Wed: 'Thứ 4',
            Thu: 'Thứ 5', Fri: 'Thứ 6', Sat: 'Thứ 7', Sun: 'CN'
          };

          let scheduleText = cls.schedule || 'Chưa có lịch';
          if (firstSchedule) {
            const dayName = dayNames[firstSchedule.day_of_week] || firstSchedule.day_of_week;
            const startTime = firstSchedule.time_slots?.start_time 
              ? dayjs(firstSchedule.time_slots.start_time).format('HH:mm')
              : '';
            scheduleText = `  `;
          }

          // Đếm số sinh viên
          const studentCount = await prisma.students.count({
            where: {
              classes: { contains: cls.class_id }
            }
          });

          return {
            id: cls.class_id,
            code: cls.subject_code || cls.class_id,
            subject: cls.subject_name || cls.class_name,
            size: studentCount,
            schedule: scheduleText,
            room: cls.room || firstSchedule?.room_name || 'TBA',
            semester: cls.semester,
            schoolYear: cls.school_year,
            cohort: cls.cohort
          };
        })
      );
      
      res.json({
        success: true,
        data: classesWithDetails
      });
    } catch (error) {
      console.error('Error in getTeacherClasses:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách lớp học'
      });
    }
  }

  // API lấy danh sách sinh viên trong lớp
  static async getClassStudents(req, res) {
    try {
      const teacherId = req.user?.userId;
      const { classId } = req.params;
      
      if (!teacherId) {
        return res.status(401).json({
          success: false,
          message: 'Không xác định được giảng viên'
        });
      }

      if (!classId) {
        return res.status(400).json({
          success: false,
          message: 'Mã lớp học không được để trống'
        });
      }

      await prisma.$ready;

      // Kiểm tra quyền truy cập
      const classInfo = await prisma.classes.findFirst({
        where: {
          class_id: classId,
          teacher_id: teacherId
        }
      });

      if (!classInfo) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền truy cập lớp này'
        });
      }

      // Lấy danh sách sinh viên
      const students = await prisma.students.findMany({
        where: {
          classes: { contains: classId }
        },
        select: {
          student_id: true,
          full_name: true,
          email: true,
          phone: true,
          course: true,
          major: true
        },
        orderBy: {
          student_id: 'asc'
        }
      });

      // Tính tỷ lệ điểm danh
      const studentsWithAttendance = await Promise.all(
        students.map(async (student) => {
          const totalRecords = await prisma.attendanceRecord.count({
            where: {
              studentId: student.student_id,
              session: { classId: classId }
            }
          });

          const presentRecords = await prisma.attendanceRecord.count({
            where: {
              studentId: student.student_id,
              session: { classId: classId },
              status: 'present'
            }
          });

          const attendanceRate = totalRecords > 0 
            ? Math.round((presentRecords / totalRecords) * 100)
            : 0;

          return {
            id: student.student_id,
            name: student.full_name,
            email: student.email || `@student.edu.vn`,
            phone: student.phone || '',
            course: student.course,
            major: student.major,
            attendance: attendanceRate,
            note: ''
          };
        })
      );
      
      res.json({
        success: true,
        data: studentsWithAttendance
      });
    } catch (error) {
      console.error('Error in getClassStudents:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách sinh viên'
      });
    }
  }

  // API lấy tài liệu của lớp (mock - chưa có bảng materials)
  static async getClassMaterials(req, res) {
    try {
      const teacherId = req.user?.userId;
      const { classId } = req.params;

      if (!teacherId) {
        return res.status(401).json({
          success: false,
          message: 'Không xác định được giảng viên'
        });
      }

      await prisma.$ready;

      // Kiểm tra quyền truy cập
      const classInfo = await prisma.classes.findFirst({
        where: {
          class_id: classId,
          teacher_id: teacherId
        }
      });

      if (!classInfo) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền truy cập lớp này'
        });
      }

      // Mock data - sau này có thể tạo bảng materials
      const materials = [
        { name: 'Đề cương môn học.pdf', size: '320KB', date: '01/09/2025' },
        { name: 'Slide tuần 1.pptx', size: '2.1MB', date: '05/09/2025' },
        { name: 'Bài tập 01.pdf', size: '180KB', date: '07/09/2025' },
      ];

      res.json({
        success: true,
        data: materials
      });
    } catch (error) {
      console.error('Error in getClassMaterials:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách tài liệu'
      });
    }
  }

  // API lấy bảng điểm của lớp (mock)
  static async getClassGrades(req, res) {
    try {
      const teacherId = req.user?.userId;
      const { classId } = req.params;

      if (!teacherId) {
        return res.status(401).json({
          success: false,
          message: 'Không xác định được giảng viên'
        });
      }

      await prisma.$ready;

      // Kiểm tra quyền truy cập
      const classInfo = await prisma.classes.findFirst({
        where: {
          class_id: classId,
          teacher_id: teacherId
        }
      });

      if (!classInfo) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền truy cập lớp này'
        });
      }

      // Lấy danh sách sinh viên
      const students = await prisma.students.findMany({
        where: {
          classes: { contains: classId }
        },
        select: {
          student_id: true,
          full_name: true
        },
        orderBy: {
          student_id: 'asc'
        }
      });

      // Mock grades - sau này có thể tạo bảng grades
      const grades = students.map(student => ({
        id: student.student_id,
        name: student.full_name,
        attendance: Math.floor(7 + Math.random() * 3),
        assignment: Math.floor(6 + Math.random() * 4),
        midterm: parseFloat((6 + Math.random() * 4).toFixed(1)),
        final: parseFloat((6 + Math.random() * 4).toFixed(1))
      }));

      res.json({
        success: true,
        data: grades
      });
    } catch (error) {
      console.error('Error in getClassGrades:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy bảng điểm'
      });
    }
  }
}

module.exports = LopController;
