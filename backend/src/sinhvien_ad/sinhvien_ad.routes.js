const express = require('express');
const prisma = require('../config/prisma');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(auth, requireRole('admin'));

const STATUS_LABELS = {
  active: 'Hoạt động',
  locked: 'Bị khóa',
};

function mapStudent(record) {
  const classList = (record.classes || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    id: record.student_id,
    mssv: record.student_id,
    name: record.full_name,
    className: classList[0] || '',
    classList,
    cohort: record.course || '',
    major: record.major || '',
    advisor: record.advisor_name || '',
    status: STATUS_LABELS[record.status] || 'Hoạt động',
    statusCode: record.status,
    email: record.email || '',
    phone: record.phone || '',
    avatar: record.avatar_url || null,
    createdAt: record.created_at ? record.created_at.toISOString() : null,
    updatedAt: record.updated_at ? record.updated_at.toISOString() : null,
  };
}

function normalizeStatusFilter(value) {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized.includes('hoạt')) return 'active';
  if (normalized.includes('khóa')) return 'locked';
  return undefined;
}

router.get('/', async (req, res) => {
  try {
    const { search, class: classFilter, cohort, status } = req.query;

    const where = {};

    if (search && typeof search === 'string' && search.trim()) {
      where.OR = [
        { student_id: { contains: search.trim(), mode: 'insensitive' } },
        { full_name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (classFilter && typeof classFilter === 'string' && classFilter.trim() && classFilter !== 'Tất cả lớp') {
      where.classes = { contains: classFilter.trim() };
    }

    if (cohort && typeof cohort === 'string' && cohort.trim() && cohort !== 'Tất cả khóa') {
      where.course = cohort.trim();
    }

    const normalizedStatus = normalizeStatusFilter(status);
    if (normalizedStatus) {
      where.status = normalizedStatus;
    }

    const students = await prisma.students.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { full_name: 'asc' },
    });

    return res.json({
      success: true,
      students: students.map(mapStudent),
      meta: {
        total: students.length,
      },
    });
  } catch (error) {
    console.error('admin students list error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

module.exports = router;
