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
