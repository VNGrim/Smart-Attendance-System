const express = require('express');
const prisma = require('./config/prisma');
const { auth } = require('./middleware/auth');
const { requireRole } = require('./middleware/roles');

const router = express.Router();

router.use(auth, requireRole('admin'));

const ROLE_LABELS = {
  admin: 'Admin',
  teacher: 'Giảng viên',
  student: 'Sinh viên',
};

const ROLE_ICONS = {
  admin: '👤',
  teacher: '🧑\u200d🏫',
  student: '🎓',
};

const normalizeTeacherStatus = (value) => {
  if (!value) return 'active';
  const text = value.toLowerCase();
  if (text.includes('chờ') || text.includes('pending')) return 'pending';
  if (text.includes('khóa') || text.includes('nghỉ') || text.includes('dừng')) return 'locked';
  return 'active';
};

const toStatusLabel = (status) => {
  switch (status) {
    case 'locked':
      return 'Bị khóa';
    case 'pending':
      return 'Chờ kích hoạt';
    default:
      return 'Hoạt động';
  }
};

function mapAccount(record) {
  const student = Array.isArray(record.students) ? record.students[0] : null;
  const teacher = Array.isArray(record.teachers) ? record.teachers[0] : null;

  let fullName = record.user_code;
  let email = null;
  let status = 'active';
  let createdAt = null;
  let rawStatus = null;

  if (record.role === 'student' && student) {
    fullName = student.full_name ?? fullName;
    email = student.email ?? null;
    status = student.status === 'locked' ? 'locked' : 'active';
    createdAt = student.created_at ?? null;
    rawStatus = student.status ?? null;
  } else if (record.role === 'teacher' && teacher) {
    fullName = teacher.full_name ?? fullName;
    email = teacher.email ?? null;
    status = normalizeTeacherStatus(teacher.status);
    createdAt = teacher.created_at ?? null;
    rawStatus = teacher.status ?? null;
  } else {
    rawStatus = null;
  }

  const statusLabel = toStatusLabel(status);
  const roleLabel = ROLE_LABELS[record.role] ?? 'Khác';

  return {
    id: record.id,
    userCode: record.user_code,
    role: record.role,
    roleLabel,
    avatar: ROLE_ICONS[record.role] ?? '👥',
    fullName,
    email,
    status,
    statusLabel,
    rawStatus,
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : null,
    lastLogin: null,
  };
}

const applyFilters = (accounts, query) => {
  let results = accounts;

  const searchTerm = typeof query.search === 'string' ? query.search.trim().toLowerCase() : '';
  if (searchTerm) {
    results = results.filter((acc) => {
      const parts = [acc.userCode, acc.fullName, acc.email, acc.roleLabel, acc.statusLabel]
        .filter(Boolean)
        .map((item) => String(item).toLowerCase());
      return parts.some((value) => value.includes(searchTerm));
    });
  }

  const roleFilter = typeof query.role === 'string' ? query.role.trim().toLowerCase() : '';
  if (roleFilter) {
    results = results.filter((acc) => acc.role === roleFilter);
  }

  const statusFilter = typeof query.status === 'string' ? query.status.trim().toLowerCase() : '';
  if (statusFilter) {
    results = results.filter((acc) => acc.status === statusFilter);
  }

  return results;
};

const buildSummary = (accounts) => {
  return accounts.reduce(
    (acc, item) => {
      acc.total += 1;
      acc.byRole[item.role] = (acc.byRole[item.role] || 0) + 1;
      acc.byStatus[item.status] = (acc.byStatus[item.status] || 0) + 1;
      return acc;
    },
    { total: 0, byRole: {}, byStatus: {} }
  );
};

router.get('/', async (req, res) => {
  try {
    const records = await prisma.accounts.findMany({
      include: {
        students: true,
        teachers: true,
      },
      orderBy: { user_code: 'asc' },
    });

    const mapped = records.map(mapAccount);
    const filtered = applyFilters(mapped, req.query ?? {});
    const summary = buildSummary(mapped);

    return res.json({ success: true, accounts: filtered, summary });
  } catch (error) {
    console.error('admin accounts list error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

module.exports = router;
