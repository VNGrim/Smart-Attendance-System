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

module.exports = router;
