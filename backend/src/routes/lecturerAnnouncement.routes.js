const express = require('express');
const prisma = require('../config/prisma');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(auth, requireRole('teacher'));

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item == null) return '';
      if (typeof item === 'string') return item;
      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    });
  }
  if (value == null) return [];
  return [String(value)];
}

function normalizeArrayInput(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    const items = value
      .map((item) => {
        if (item == null) return null;
        if (typeof item === 'string') return item.trim();
        try {
          return JSON.stringify(item);
        } catch {
          return String(item);
        }
      })
      .filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof value === 'string') {
    const items = value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? items : undefined;
  }
  return [String(value)];
}

function parseNullableDate(input) {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(String(input));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function mapAnnouncement(record) {
  const sendTime = record.send_time ?? record.created_at;
  return {
    id: record.code ?? `LEC-ANN-${record.id}`,
    dbId: record.id,
    title: record.title ?? '',
    content: record.content ?? '',
    sender: record.sender ?? '',
    target: record.target ?? '',
    category: record.category ?? 'general',
    type: record.type ?? 'Khác',
    status: record.status ?? 'Đã gửi',
    sendTime: sendTime ? sendTime.toISOString() : null,
    scheduledAt: record.scheduled_at ? record.scheduled_at.toISOString() : null,
    recipients: normalizeArray(record.recipients),
    history: normalizeArray(record.history),
    createdAt: record.created_at ? record.created_at.toISOString() : null,
    updatedAt: record.updated_at ? record.updated_at.toISOString() : null,
  };
}

// GET / => List all announcements by the logged-in lecturer
router.get('/', async (req, res) => {
  try {
    const fullName = req.user?.fullName;
    if (!fullName) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const records = await prisma.announcements.findMany({
      where: { sender: fullName },
      orderBy: { created_at: 'desc' },
    });

    const data = records.map(mapAnnouncement);
    return res.json({ success: true, message: 'Lấy danh sách thông báo thành công', data });
  } catch (err) {
    console.error('lecturer announcements list error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

// GET /classes => Return all classes taught by the lecturer
router.get('/classes', async (req, res) => {
  try {
    const teacherId = req.user?.user_code;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const classes = await prisma.classes.findMany({
      where: { teacher_id: teacherId },
      orderBy: [{ school_year: 'desc' }, { semester: 'desc' }, { class_name: 'asc' }],
      select: {
        class_id: true,
        class_name: true,
        subject_code: true,
        subject_name: true,
        semester: true,
        school_year: true,
      },
    });

    return res.json({ success: true, message: 'Lấy danh sách lớp thành công', data: classes });
  } catch (err) {
    console.error('lecturer classes list error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

// GET /students?classId=... => List all students in that class
router.get('/students', async (req, res) => {
  try {
    const teacherId = req.user?.user_code;
    const classId = typeof req.query.classId === 'string' ? req.query.classId.trim() : '';
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!classId) return res.status(400).json({ success: false, message: 'Thiếu classId' });

    // Ensure the class belongs to this teacher
    const klass = await prisma.classes.findFirst({ where: { class_id: classId, teacher_id: teacherId } });
    if (!klass) return res.status(403).json({ success: false, message: 'Bạn không có quyền xem lớp này' });

    const students = await prisma.$queryRaw`
      SELECT s.student_id, s.full_name, s.email, s.phone, s.course
      FROM students s
      JOIN student_classes sc ON s.student_id = sc.student_id
      WHERE sc.class_id = ${classId}
      ORDER BY s.full_name`;

    return res.json({ success: true, message: 'Lấy danh sách sinh viên thành công', data: students });
  } catch (err) {
    console.error('lecturer students list error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

// GET /:id => View announcement details (own announcements only)
router.get('/:id', async (req, res) => {
  try {
    const fullName = req.user?.fullName;
    if (!fullName) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Thiếu mã thông báo' });

    const numericId = Number(id);
    const record = await prisma.announcements.findFirst({
      where: {
        sender: fullName,
        OR: [
          { code: id },
          ...(Number.isNaN(numericId) ? [] : [{ id: numericId }]),
        ],
      },
    });

    if (!record) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });

    // Ensure code format
    if (!record.code || !record.code.startsWith('LEC-ANN-')) {
      const newCode = `LEC-ANN-${record.id}`;
      await prisma.announcements.update({ where: { id: record.id }, data: { code: newCode } });
      record.code = newCode;
    }

    return res.json({ success: true, message: 'Lấy chi tiết thông báo thành công', data: mapAnnouncement(record) });
  } catch (err) {
    console.error('lecturer announcement detail error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

// Helper to collect recipients from classes
async function collectStudentIdsFromClasses(classIds, teacherId) {
  if (!Array.isArray(classIds) || classIds.length === 0) return [];
  const validClasses = await prisma.classes.findMany({
    where: { teacher_id: teacherId, class_id: { in: classIds } },
    select: { class_id: true },
  });
  const allowed = new Set(validClasses.map((c) => c.class_id));
  if (!allowed.size) return [];

  const ids = await prisma.$queryRaw`
    SELECT DISTINCT sc.student_id
    FROM student_classes sc
    WHERE sc.class_id IN (${prisma.join([...allowed])})`;
  return ids.map((r) => r.student_id);
}

// POST / => Create a new announcement
router.post('/', async (req, res) => {
  try {
    const user = req.user || {};
    const fullName = user.fullName;
    const teacherId = user.user_code;
    if (!fullName || !teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const {
      title,
      content,
      category,
      type,
      status,
      sendTime,
      scheduledAt,
      classIds,
      studentIds,
    } = req.body ?? {};

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung là bắt buộc' });
    }

    const normalizedCategory = typeof category === 'string' && category.trim() ? category.trim() : 'general';
    const normalizedStatus = typeof status === 'string' && status.trim() ? status.trim() : 'Nháp';
    const normalizedType = typeof type === 'string' && type.trim() ? type.trim() : 'Khác';

    const sendDate = parseNullableDate(sendTime);
    const scheduleDate = parseNullableDate(scheduledAt);

    // Determine recipients
    let recipientsList = Array.isArray(studentIds) ? studentIds.filter(Boolean) : [];
    if (!recipientsList.length && Array.isArray(classIds) && classIds.length) {
      recipientsList = await collectStudentIdsFromClasses(classIds.filter(Boolean), teacherId);
    }

    const payload = {
      title: String(title),
      content: String(content),
      sender: fullName,
      target: Array.isArray(classIds) && classIds.length
        ? `Lớp: ${classIds.join(',')}`
        : (Array.isArray(recipientsList) && recipientsList.length ? `Sinh viên: ${recipientsList.length}` : ''),
      category: normalizedCategory,
      type: normalizedType,
      status: normalizedStatus,
      send_time: normalizedStatus.toLowerCase().includes('gửi') ? (sendDate ?? new Date()) : null,
      scheduled_at: normalizedStatus.toLowerCase().includes('lịch') ? scheduleDate : null,
      recipients: normalizeArrayInput(recipientsList),
      history: normalizeArrayInput([{ action: 'create', by: fullName, at: new Date().toISOString() }]),
    };

    const created = await prisma.announcements.create({ data: payload });

    let saved = created;
    if (!created.code || !created.code.startsWith('LEC-ANN-')) {
      saved = await prisma.announcements.update({
        where: { id: created.id },
        data: { code: `LEC-ANN-${created.id}` },
      });
    }

    return res.status(201).json({ success: true, message: 'Tạo thông báo thành công', data: mapAnnouncement(saved) });
  } catch (err) {
    console.error('lecturer announcement create error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

module.exports = router;
