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

function extractCohortDigits(cohort) {
  if (!cohort) return null;
  const normalized = String(cohort).trim().toUpperCase();
  const match = normalized.match(/(\d{2,})$/);
  return match ? match[1] : null;
}

async function generateStudentId(course) {
  const digits = extractCohortDigits(course);
  if (!digits) {
    const err = new Error('INVALID_COHORT');
    err.code = 'INVALID_COHORT';
    throw err;
  }

  const prefix = `SE${digits}`;
  const likePattern = `${prefix}%`;

  const rows = await prisma.$queryRaw`
    SELECT student_id
    FROM students
    WHERE student_id LIKE ${likePattern}
    ORDER BY student_id DESC
    LIMIT 1
  `;

  const lastId = rows?.[0]?.student_id || null;
  const nextNumber = lastId ? parseInt(lastId.slice(prefix.length), 10) + 1 : 1;
  const padded = Number.isFinite(nextNumber) ? nextNumber.toString().padStart(4, '0') : '0001';
  return `${prefix}${padded}`;
}

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

router.get('/options', async (req, res) => {
  try {
    const [classRows, cohortRows, majorRows, advisorRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT class_id, class_name
        FROM classes
        ORDER BY class_name ASC
      `,
      prisma.cohorts.findMany({
        orderBy: [{ year: 'asc' }],
      }),
      prisma.$queryRaw`
        SELECT DISTINCT major
        FROM students
        WHERE major IS NOT NULL AND major <> ''
        ORDER BY major ASC
      `,
      prisma.teachers.findMany({
        select: { teacher_id: true, full_name: true, subject: true },
        orderBy: { full_name: 'asc' },
      }),
    ]);

    const classes = (classRows || []).map((cls) => ({
      id: cls.class_id,
      name: cls.class_name || cls.class_id,
    }));

    const cohorts = (cohortRows || [])
      .map((row) => row.code)
      .filter(Boolean);

    if (cohorts.length) {
      const latest = cohortRows[cohortRows.length - 1];
      if (latest?.year) {
        const nextYear = latest.year + 1;
        const nextCode = `K${String(nextYear).slice(-2)}`;
        if (!cohorts.includes(nextCode)) {
          await prisma.cohorts.upsert({
            where: { code: nextCode },
            update: { year: nextYear },
            create: { code: nextCode, year: nextYear },
          });
          cohorts.push(nextCode);
        }
      }
    }

    const majors = (majorRows || [])
      .map((row) => row.major)
      .filter(Boolean);

    const advisors = (advisorRows || []).map((row) => ({
      id: row.teacher_id,
      name: row.full_name,
      subject: row.subject ?? null,
    }));

    return res.json({
      success: true,
      data: {
        classes,
        cohorts,
        majors,
        advisors,
      },
    });
  } catch (error) {
    console.error('admin students options error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

router.get('/next-id', async (req, res) => {
  try {
    const { cohort } = req.query;
    if (!cohort || typeof cohort !== 'string' || !cohort.trim()) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin khóa (cohort)' });
    }

    const nextId = await generateStudentId(cohort.trim());
    return res.json({ success: true, data: { nextId } });
  } catch (error) {
    if (error.code === 'INVALID_COHORT') {
      return res.status(400).json({ success: false, message: 'Định dạng khóa không hợp lệ. Ví dụ hợp lệ: K18, K2023.' });
    }
    console.error('admin students next-id error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

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

router.get('/lookup/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Thiếu MSSV' });
    }

    const record = await prisma.students.findUnique({
      where: { student_id: studentId },
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
    }

    return res.json({ success: true, student: mapStudent(record) });
  } catch (error) {
    console.error('admin students lookup error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      mssv,
      fullName,
      email,
      cohort,
      className,
      classes,
      major,
      advisor,
      status,
      password,
      phone,
    } = req.body || {};

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Họ tên là bắt buộc' });
    }

    const trimmedCohort = typeof cohort === 'string' ? cohort.trim() : '';
    if (!trimmedCohort) {
      return res.status(400).json({ success: false, message: 'Khóa là bắt buộc' });
    }

    let studentId = (typeof mssv === 'string' && mssv.trim()) ? mssv.trim().toUpperCase() : null;
    if (!studentId) {
      studentId = await generateStudentId(trimmedCohort);
    }

    const existingStudent = await prisma.students.findUnique({ where: { student_id: studentId } });
    if (existingStudent) {
      return res.status(409).json({ success: false, message: 'MSSV đã tồn tại' });
    }

    const existingAccount = await prisma.accounts.findUnique({ where: { user_code: studentId } });
    if (existingAccount) {
      return res.status(409).json({ success: false, message: 'Tài khoản với MSSV này đã tồn tại' });
    }

    const passwordToUse = typeof password === 'string' && password.trim() ? password.trim() : 'sinhvienfpt';
    const classesValue = Array.isArray(classes)
      ? classes.filter(Boolean).join(', ')
      : (className && typeof className === 'string') ? className.trim() : '';

    const statusCode = normalizeStatusFilter(status) || 'active';

    const createdStudent = await prisma.$transaction(async (tx) => {
      const account = await tx.accounts.create({
        data: {
          user_code: studentId,
          password: passwordToUse,
          role: 'student',
        },
      });

      const studentRecord = await tx.students.create({
        data: {
          student_id: studentId,
          full_name: fullName.trim(),
          email: email && typeof email === 'string' ? email.trim() : null,
          course: trimmedCohort,
          classes: classesValue || null,
          major: major && typeof major === 'string' ? major.trim() : null,
          advisor_name: advisor && typeof advisor === 'string' ? advisor.trim() : null,
          status: statusCode,
          phone: phone && typeof phone === 'string' ? phone.trim() : null,
          account_id: account.id,
        },
      });

      return studentRecord;
    });

    return res.status(201).json({
      success: true,
      student: mapStudent(createdStudent),
    });
  } catch (error) {
    if (error.code === 'INVALID_COHORT') {
      return res.status(400).json({ success: false, message: 'Định dạng khóa không hợp lệ. Ví dụ hợp lệ: K18, K2023.' });
    }
    console.error('admin students create error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

module.exports = router;
