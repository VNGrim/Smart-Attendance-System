const express = require('express');
const prisma = require('../config/prisma');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

// All routes under this router require admin authentication
router.use(auth, requireRole('admin'));

// GET /api/admin/overview/students/count
router.get('/students/count', async (req, res) => {
  try {
    const count = await prisma.students.count();
    return res.json({ count });
  } catch (err) {
    console.error('students count error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

// GET /api/admin/overview/classes/count
// Count distinct class identifiers from timetable
router.get('/classes/count', async (req, res) => {
  try {
    const distinct = await prisma.timetable.findMany({
      select: { classes: true },
      distinct: ['classes'],
    });
    return res.json({ count: distinct.length });
  } catch (err) {
    console.error('classes count error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

// GET /api/admin/overview/sessions/today/count
// Count number of timetable entries whose day_of_week matches today
router.get('/sessions/today/count', async (req, res) => {
  try {
    const map = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const todayEnum = map[new Date().getDay()];
    const count = await prisma.timetable.count({ where: { day_of_week: todayEnum } });
    return res.json({ count, day_of_week: todayEnum });
  } catch (err) {
    console.error('sessions today count error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

// GET /api/admin/overview/activities/recent
// Aggregate recent activity from announcements, newly created students & teachers
router.get('/activities/recent', async (req, res) => {
  try {
    const [announcements, students, teachers] = await Promise.all([
      prisma.announcements.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
      prisma.students.findMany({
        where: { created_at: { not: null } },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
      prisma.teachers.findMany({
        where: { created_at: { not: null } },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
    ]);

    const items = [];

    for (const ann of announcements) {
      if (!ann.created_at) continue;
      items.push({
        id: `announcement-${ann.id}`,
        type: 'announcement',
        time: ann.created_at,
        action: `Gửi thông báo "${ann.title}"`,
        actor: 'Admin',
        detail: ann.content,
      });
    }

    for (const st of students) {
      if (!st.created_at) continue;
      items.push({
        id: `student-${st.student_id}`,
        type: 'student_created',
        time: st.created_at,
        action: `Thêm sinh viên ${st.student_id}`,
        actor: 'Admin',
        detail: `${st.full_name}${st.classes ? ` · Lớp ${st.classes}` : ''}${st.course ? ` · Khóa ${st.course}` : ''}`,
      });
    }

    for (const tc of teachers) {
      if (!tc.created_at) continue;
      items.push({
        id: `teacher-${tc.teacher_id}`,
        type: 'teacher_created',
        time: tc.created_at,
        action: `Thêm giảng viên ${tc.teacher_id}`,
        actor: 'Admin',
        detail: `${tc.full_name}${tc.subject ? ` · Môn ${tc.subject}` : ''}${tc.classes ? ` · Lớp ${tc.classes}` : ''}`,
      });
    }

    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return res.json({ items: items.slice(0, 10) });
  } catch (err) {
    console.error('activities recent error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

// GET /api/admin/overview/lecturers/count
router.get('/lecturers/count', async (req, res) => {
  try {
    const count = await prisma.teachers.count();
    return res.json({ count });
  } catch (err) {
    console.error('lecturers count error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

// GET /api/admin/overview/lecturers/monthly-delta
router.get('/lecturers/monthly-delta', async (req, res) => {
  try {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [currentNew, prevNew, total] = await Promise.all([
      prisma.teachers.count({
        where: {
          created_at: {
            gte: startOfCurrentMonth,
            lt: startOfNextMonth,
          },
        },
      }),
      prisma.teachers.count({
        where: {
          created_at: {
            gte: startOfPrevMonth,
            lt: startOfCurrentMonth,
          },
        },
      }),
      prisma.teachers.count(),
    ]);

    return res.json({ currentNew, prevNew, delta: currentNew - prevNew, total });
  } catch (err) {
    console.error('lecturers monthly-delta error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

// GET /api/admin/overview/students/monthly-delta
// Returns number of new students in current month vs previous month
router.get('/students/monthly-delta', async (req, res) => {
  try {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [currentNew, prevNew, total] = await Promise.all([
      prisma.students.count({
        where: {
          created_at: {
            gte: startOfCurrentMonth,
            lt: startOfNextMonth,
          },
        },
      }),
      prisma.students.count({
        where: {
          created_at: {
            gte: startOfPrevMonth,
            lt: startOfCurrentMonth,
          },
        },
      }),
      prisma.students.count(),
    ]);

    return res.json({ currentNew, prevNew, delta: currentNew - prevNew, total });
  } catch (err) {
    console.error('students monthly-delta error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

module.exports = router;
