const express = require('express');
const prisma = require('../config/prisma');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(auth, requireRole('admin'));

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

function mapLecturer(record) {
  return {
    teacherId: record.teacher_id,
    fullName: record.full_name,
    subject: record.subject ?? null,
    classes: record.classes ?? null,
  };
}

function mapAnnouncement(record) {
  const sendTime = record.send_time ?? record.created_at;
  return {
    id: record.code ?? `ANN-${record.id}`,
    dbId: record.id,
    title: record.title ?? '',
    content: record.content ?? '',
    sender: record.sender ?? 'Admin',
    target: record.target ?? 'Toàn trường',
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

router.get('/', async (req, res) => {
  try {
    const records = await prisma.announcements.findMany({
      orderBy: { created_at: 'desc' },
    });

    const announcements = records.map(mapAnnouncement);
    return res.json({ success: true, announcements });
  } catch (err) {
    console.error('admin announcements list error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

router.get('/lecturers', async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const idsParam = typeof req.query.ids === 'string' ? req.query.ids : '';
    const ids = idsParam
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const where = {};
    if (ids.length) {
      where.teacher_id = { in: ids };
    } else if (search) {
      where.OR = [
        { teacher_id: { contains: search, mode: 'insensitive' } },
        { full_name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    const lecturers = await prisma.teachers.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { full_name: 'asc' },
      take: ids.length ? undefined : 50,
    });

    return res.json({
      success: true,
      lecturers: lecturers.map(mapLecturer),
    });
  } catch (err) {
    console.error('admin lecturers list error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Thiếu mã thông báo' });
    }

    const numericId = Number(id);
    const record = await prisma.announcements.findFirst({
      where: {
        OR: [
          { code: id },
          ...(Number.isNaN(numericId) ? [] : [{ id: numericId }]),
        ],
      },
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
    }

    if (!record.code) {
      const newCode = `ANN-${record.id}`;
      await prisma.announcements.update({ where: { id: record.id }, data: { code: newCode } });
      record.code = newCode;
    }

    return res.json({ success: true, announcement: mapAnnouncement(record) });
  } catch (err) {
    console.error('admin announcement detail error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

router.post('/', async (req, res) => {
  try {
    console.log('admin announcement create request body:', req.body);
    const {
      title,
      content,
      sender,
      target,
      category,
      type,
      status,
      sendTime,
      scheduledAt,
      recipients,
      history,
    } = req.body ?? {};

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung là bắt buộc' });
    }

    const normalizedCategory = typeof category === 'string' && category.trim() ? category.trim() : 'general';
    const normalizedStatus = typeof status === 'string' && status.trim() ? status.trim() : 'Nháp';
    const normalizedType = typeof type === 'string' && type.trim() ? type.trim() : 'Khác';
    const normalizedSender = typeof sender === 'string' && sender.trim() ? sender.trim() : 'Admin';
    const normalizedTarget = typeof target === 'string' && target.trim() ? target.trim() : 'Toàn trường';

    const sendDate = parseNullableDate(sendTime);
    const scheduleDate = parseNullableDate(scheduledAt);

    const payload = {
      title: String(title),
      content: String(content),
      sender: normalizedSender,
      target: normalizedTarget,
      category: normalizedCategory,
      type: normalizedType,
      status: normalizedStatus,
      send_time: normalizedStatus.toLowerCase().includes('gửi') ? sendDate ?? new Date() : null,
      scheduled_at: normalizedStatus.toLowerCase().includes('lịch') ? scheduleDate : null,
      recipients: normalizeArrayInput(recipients),
      history: normalizeArrayInput(history),
    };

    const created = await prisma.announcements.create({ data: payload });

    if (!created.code) {
      const updated = await prisma.announcements.update({
        where: { id: created.id },
        data: { code: `ANN-${created.id}` },
      });
      return res.status(201).json({ success: true, announcement: mapAnnouncement(updated) });
    }

    return res.status(201).json({ success: true, announcement: mapAnnouncement(created) });
  } catch (err) {
    console.error('admin announcement create error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

module.exports = router;
