const express = require('express');
const ExcelJS = require('exceljs');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(auth, requireRole('admin'));


const DEFAULT_PASSWORD = 'giangvienfpt';
const ALLOWED_STATUSES = new Set(['Đang dạy', 'Tạm nghỉ', 'Thôi việc']);

function normalizeStatus(status) {
  if (typeof status !== 'string') return 'Đang dạy';
  const normalized = status.trim();
  return ALLOWED_STATUSES.has(normalized) ? normalized : 'Đang dạy';
}

async function generateLecturerId() {
  const rows = await prisma.$queryRaw`
    SELECT teacher_id
    FROM teachers
    WHERE teacher_id LIKE 'GV%'
    ORDER BY teacher_id DESC
    LIMIT 1
  `;

  const lastId = rows?.[0]?.teacher_id || null;
  const nextNumber = lastId ? parseInt(lastId.replace(/^GV/i, ''), 10) + 1 : 1;
  const padded = Number.isFinite(nextNumber) ? nextNumber.toString().padStart(3, '0') : '001';
  return `GV${padded}`;
}

function mapLecturer(record) {
  if (!record) return null;
  const classList = (record.classes || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    id: record.teacher_id,
    code: record.teacher_id,
    name: record.full_name,
    dept: record.subject || '',
    faculty: record.faculty || '',
    status: record.status || 'Đang dạy',
    email: record.email || '',
    phone: record.phone || '',
    classes: classList.length,
    classList,
    createdAt: record.created_at ? record.created_at.toISOString() : null,
    updatedAt: record.updated_at ? record.updated_at.toISOString() : null,
  };
}

router.get('/next-id', async (req, res) => {
  try {
    const nextId = await generateLecturerId();
    return res.json({ success: true, data: { nextId } });
  } catch (error) {
    console.error('admin lecturers next-id error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

router.get('/', async (req, res) => {
  try {
    // Lấy danh sách giảng viên
    const lecturers = await prisma.teachers.findMany({
      orderBy: { full_name: 'asc' },
    });

    // Lấy số lớp cho từng giảng viên từ bảng classes
    const teacherIds = lecturers.map(l => l.teacher_id);
    const classCounts = await prisma.classes.groupBy({
      by: ['teacher_id'],
      where: {
        teacher_id: { in: teacherIds }
      },
      _count: { class_id: true }
    });

    // Map teacher_id -> số lớp
    const classCountMap = {};
    classCounts.forEach(item => {
      classCountMap[item.teacher_id] = item._count.class_id;
    });

    // Trả về lecturers với số lớp thực tế
    return res.json({
      success: true,
      lecturers: lecturers.map(l => ({
        ...mapLecturer(l),
        classes: classCountMap[l.teacher_id] || 0
      })),
    });
  } catch (error) {
    console.error('admin lecturers list error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      code,
      fullName,
      email,
      phone,
      subject,
      faculty,
      status,
      password,
      classes,
    } = req.body || {};

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Họ tên là bắt buộc' });
    }

    let teacherId = typeof code === 'string' && code.trim() ? code.trim().toUpperCase() : null;
    if (!teacherId) {
      teacherId = await generateLecturerId();
    }

    const existingTeacher = await prisma.teachers.findUnique({ where: { teacher_id: teacherId } });
    if (existingTeacher) {
      return res.status(409).json({ success: false, message: 'Mã giảng viên đã tồn tại' });
    }

    const existingAccount = await prisma.accounts.findUnique({ where: { user_code: teacherId } });
    if (existingAccount) {
      return res.status(409).json({ success: false, message: 'Tài khoản với mã này đã tồn tại' });
    }

    const passwordToUse = typeof password === 'string' && password.trim() ? password.trim() : DEFAULT_PASSWORD;
    const hashedPassword = await bcrypt.hash(passwordToUse, 10);
    const subjectToUse = typeof subject === 'string' && subject.trim() ? subject.trim() : 'Chưa phân công';
    const facultyToUse = typeof faculty === 'string' && faculty.trim() ? faculty.trim() : 'Chưa cập nhật';
    const statusToUse = normalizeStatus(status);
    const classesValue = Array.isArray(classes)
      ? classes.map((item) => String(item || '').trim()).filter(Boolean).join(', ')
      : null;

    const teacherRecord = await prisma.$transaction(async (tx) => {
      const account = await tx.accounts.create({
        data: {
          user_code: teacherId,
          password: hashedPassword,
          role: 'teacher',
        },
      });

      const createdTeacher = await tx.teachers.create({
        data: {
          teacher_id: teacherId,
          full_name: fullName.trim(),
          email: email && typeof email === 'string' ? email.trim() : null,
          phone: phone && typeof phone === 'string' ? phone.trim() : null,
          subject: subjectToUse,
          faculty: facultyToUse,
          status: statusToUse,
          classes: classesValue,
          account_id: account.id,
        },
      });

      return createdTeacher;
    });

    return res.status(201).json({
      success: true,
      lecturer: mapLecturer(teacherRecord),
    });
  } catch (error) {
    console.error('admin lecturers create error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

module.exports = router;
