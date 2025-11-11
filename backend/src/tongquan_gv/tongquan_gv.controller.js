const prisma = require("../config/prisma");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const weekOfYear = require("dayjs/plugin/weekOfYear");
const isoWeek = require("dayjs/plugin/isoWeek");
const advancedFormat = require("dayjs/plugin/advancedFormat");

dayjs.extend(utc);
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(advancedFormat);

// Lấy thống kê tổng quan
exports.getTeacherStats = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) {
      return res.status(401).json({ success: false, message: "Không xác định được giảng viên" });
    }

    await prisma.$ready;

    // Đếm số lớp đang dạy
    const classesCount = await prisma.classes.count({
      where: { 
        teacher_id: teacherId,
        status: "Đang hoạt động"
      }
    });

    // Đếm buổi học hôm nay
    const today = dayjs().format("YYYY-MM-DD");
    const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayjs().day()];
    
    const todaySessions = await prisma.timetable.count({
      where: {
        teacher_id: teacherId,
        day_of_week: dayOfWeek,
      }
    });

    // Đếm tổng số sinh viên (qua các lớp đang dạy)
    const classes = await prisma.classes.findMany({
      where: { 
        teacher_id: teacherId,
        status: "Đang hoạt động"
      },
      select: { class_id: true }
    });

    const classIds = classes.map(c => c.class_id);
    
    let studentsCount = 0;
    if (classIds.length > 0) {
      const students = await prisma.students.findMany({
        where: {
          classes: {
            contains: classIds.join(',')
          }
        }
      });
      
      // Đếm sinh viên unique
      const uniqueStudents = new Set();
      students.forEach(s => {
        const studentClasses = s.classes?.split(',').map(c => c.trim()) || [];
        const hasClass = studentClasses.some(c => classIds.includes(c));
        if (hasClass) uniqueStudents.add(s.student_id);
      });
      studentsCount = uniqueStudents.size;
    }

    // Đếm thông báo chưa đọc (giả sử có bảng notifications)
    const notificationsCount = await prisma.announcements.count({
      where: {
        sender_id: teacherId,
        created_at: {
          gte: dayjs().subtract(7, 'day').toDate()
        }
      }
    }).catch(() => 0);

    return res.json({
      success: true,
      data: {
        classes: classesCount,
        sessionsToday: todaySessions,
        students: studentsCount,
        notifications: notificationsCount
      }
    });
  } catch (err) {
    console.error("Teacher stats error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy lịch dạy tuần này
exports.getWeekSchedule = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) {
      return res.status(401).json({ success: false, message: "Không xác định được giảng viên" });
    }

    await prisma.$ready;

    // Lấy tuần hiện tại (format: 2025-W45)
    let weekKey = req.query.week;
    if (!weekKey) {
      const now = dayjs();
      const year = now.isoWeekYear();
      const week = String(now.isoWeek()).padStart(2, '0');
      weekKey = `${year}-W${week}`;
    }

    const schedule = await prisma.timetable.findMany({
      where: {
        teacher_id: teacherId,
        week_key: weekKey
      },
      include: {
        time_slots: true
      },
      orderBy: [
        { day_of_week: 'asc' },
        { slot_id: 'asc' }
      ]
    });

    // Lấy thông tin lớp
    const classIds = [...new Set(schedule.map(s => s.classes))];
    const classesData = await prisma.classes.findMany({
      where: { class_id: { in: classIds } },
      select: { 
        class_id: true, 
        class_name: true,
        subject_code: true,
        subject_name: true 
      }
    });

    const classMap = new Map(classesData.map(c => [c.class_id, c]));

    // Map sang định dạng frontend
    const dayNames = {
      Mon: "Thứ 2",
      Tue: "Thứ 3", 
      Wed: "Thứ 4",
      Thu: "Thứ 5",
      Fri: "Thứ 6",
      Sat: "Thứ 7",
      Sun: "Chủ nhật"
    };

    const mappedSchedule = schedule.map(s => {
      const classInfo = classMap.get(s.classes);
      const startTime = s.time_slots?.start_time ? dayjs(s.time_slots.start_time).format("HH:mm") : "";
      const endTime = s.time_slots?.end_time ? dayjs(s.time_slots.end_time).format("HH:mm") : "";

      return {
        id: `${s.classes}-${s.day_of_week}-${s.slot_id}`,
        code: s.classes,
        subject: classInfo?.subject_code || classInfo?.subject_name || s.subject_name || "",
        subjectName: classInfo?.subject_name || s.subject_name || "",
        day: dayNames[s.day_of_week] || s.day_of_week,
        time: `${startTime}–${endTime}`,
        room: s.room_name || s.room || "",
        slot: s.slot_id
      };
    });

    return res.json({
      success: true,
      data: mappedSchedule
    });
  } catch (err) {
    console.error("Teacher week schedule error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy thông báo gần nhất
exports.getRecentNotifications = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) {
      return res.status(401).json({ success: false, message: "Không xác định được giảng viên" });
    }

    await prisma.$ready;

    const limit = parseInt(req.query.limit) || 5;

    // Lấy thông báo gửi đến giảng viên hoặc do giảng viên tạo
    const notifications = await prisma.announcements.findMany({
      where: {
        OR: [
          { sender: teacherId },
          { target: 'Giảng viên' }
        ]
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limit
    });

    const mapped = notifications.map(n => ({
      id: n.id.toString(),
      title: n.title,
      from: n.sender_id === teacherId ? "Bạn" : n.sender_name || "Hệ thống",
      date: dayjs(n.created_at).format("DD/MM/YYYY"),
      content: n.content || ""
    }));

    return res.json({
      success: true,
      data: mapped
    });
  } catch (err) {
    console.error("Teacher notifications error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy ghi chú điểm danh gần nhất
exports.getLatestAttendanceNote = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) {
      return res.status(401).json({ success: false, message: "Không xác định được giảng viên" });
    }

    await prisma.$ready;

    // Lấy session điểm danh gần nhất
    const latestSession = await prisma.attendanceSession.findFirst({
      where: {
        session_class: {
          teacher_id: teacherId
        }
      },
      include: {
        session_class: {
          select: {
            class_id: true,
            class_name: true
          }
        },
        records: {
          select: {
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!latestSession) {
      return res.json({
        success: true,
        data: "Chưa có buổi điểm danh nào."
      });
    }

    const totalRecords = latestSession.records.length;
    const presentCount = latestSession.records.filter(r => r.status === 'present').length;
    const percentage = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    const note = `Lớp ${latestSession.session_class?.class_id || 'N/A'} vừa được điểm danh ${percentage}% (${presentCount}/${totalRecords} sinh viên).`;

    return res.json({
      success: true,
      data: note
    });
  } catch (err) {
    console.error("Latest attendance note error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy lịch 3 ngày (hôm qua, hôm nay, ngày mai)
exports.getThreeDaysSchedule = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) {
      return res.status(401).json({ success: false, message: "Không xác định được giảng viên" });
    }

    await prisma.$ready;

    // Tính yesterday, today, tomorrow
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Map ngày sang day_of_week database format (Mon, Tue, Wed, ...)
    const getDayOfWeek = (date) => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[date.getDay()];
    };

    const yesterdayDow = getDayOfWeek(yesterday);
    const todayDow = getDayOfWeek(today);
    const tomorrowDow = getDayOfWeek(tomorrow);

    // Lấy week_key cho từng ngày (format: 2025-W45)
    const getWeekKey = (date) => {
      const d = dayjs(date);
      const year = d.isoWeekYear();
      const week = String(d.isoWeek()).padStart(2, '0');
      return `${year}-W${week}`;
    };

    const yesterdayWeek = getWeekKey(yesterday);
    const todayWeek = getWeekKey(today);
    const tomorrowWeek = getWeekKey(tomorrow);

    // Query lịch cho 3 ngày
    const timetable = await prisma.timetable.findMany({
      where: {
        teacher_id: teacherId,
        OR: [
          { week_key: yesterdayWeek, day_of_week: yesterdayDow },
          { week_key: todayWeek, day_of_week: todayDow },
          { week_key: tomorrowWeek, day_of_week: tomorrowDow },
        ],
      },
      include: {
        time_slots: {
          select: {
            start_time: true,
            end_time: true,
          },
        },
      },
      orderBy: [
        { day_of_week: 'asc' },
        { slot_id: 'asc' },
      ],
    });

    // Lấy thông tin classes
    const classIds = [...new Set(timetable.map(t => t.classes))];
    const classesData = await prisma.classes.findMany({
      where: { class_id: { in: classIds } },
      select: {
        class_id: true,
        class_name: true,
        subject_code: true,
        subject_name: true,
      },
    });

    const classMap = new Map(classesData.map(c => [c.class_id, c]));

    // Format dữ liệu theo từng ngày
    const formatDate = (date) => {
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}`;
    };

    const dayNamesVi = {
      Mon: "Thứ 2",
      Tue: "Thứ 3",
      Wed: "Thứ 4",
      Thu: "Thứ 5",
      Fri: "Thứ 6",
      Sat: "Thứ 7",
      Sun: "CN",
    };

    const groupByDay = (dow) => {
      return timetable
        .filter(item => item.day_of_week === dow)
        .map(item => {
          const classInfo = classMap.get(item.classes);
          const startTime = item.time_slots?.start_time ? dayjs(item.time_slots.start_time).format('HH:mm') : '';
          const endTime = item.time_slots?.end_time ? dayjs(item.time_slots.end_time).format('HH:mm') : '';

          return {
            id: `${item.classes}-${item.day_of_week}-${item.slot_id}`,
            classId: item.classes,
            subjectCode: classInfo?.subject_code || 'N/A',
            subjectName: classInfo?.subject_name || 'Không rõ môn',
            time: `${startTime}–${endTime}`,
            room: item.room_name || item.room || 'TBA',
          };
        });
    };

    const scheduleData = {
      yesterday: {
        date: formatDate(yesterday),
        dayName: dayNamesVi[yesterdayDow] || yesterdayDow,
        classes: groupByDay(yesterdayDow),
      },
      today: {
        date: formatDate(today),
        dayName: dayNamesVi[todayDow] || todayDow,
        classes: groupByDay(todayDow),
      },
      tomorrow: {
        date: formatDate(tomorrow),
        dayName: dayNamesVi[tomorrowDow] || tomorrowDow,
        classes: groupByDay(tomorrowDow),
      },
    };

    return res.json({
      success: true,
      data: scheduleData,
    });
  } catch (error) {
    console.error('Error fetching 3-day schedule:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy lịch 3 ngày' });
  }
};
