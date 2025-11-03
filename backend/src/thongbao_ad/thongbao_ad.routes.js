const express = require('express');
const prisma = require('../config/prisma');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const ThongBaoModel = require('../thongbao_hienthi/thongbao_hienthi.model');

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

function mapAnnouncement(record, stats = null) {
  const sendTime = record.send_time ?? record.created_at;
  const announcement = {
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
    allowReply: Boolean(record.allow_reply),
    replyUntil: record.reply_until ? record.reply_until.toISOString() : null,
    createdAt: record.created_at ? record.created_at.toISOString() : null,
    updatedAt: record.updated_at ? record.updated_at.toISOString() : null,
  };
  if (stats) {
    announcement.replyStats = {
      total: stats.total,
      unread: stats.unread,
      latestAt: stats.latestAt ? stats.latestAt.toISOString() : null,
    };
  }
  return announcement;
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
    const [records, replyAggregates, unreadAggregates] = await Promise.all([
      prisma.announcements.findMany({
        orderBy: { created_at: 'desc' },
      }),
      prisma.announcement_replies.groupBy({
        by: ['announcement_id'],
        _count: { _all: true },
        _max: { created_at: true },
      }),
      prisma.announcement_replies.groupBy({
        by: ['announcement_id'],
        where: { read_at: null },
        _count: { _all: true },
      }),
    ]);

    const statsMap = new Map();
    replyAggregates.forEach((item) => {
      statsMap.set(item.announcement_id, {
        total: item._count._all,
        unread: 0,
        latestAt: item._max.created_at ?? null,
      });
    });
    unreadAggregates.forEach((item) => {
      const stat = statsMap.get(item.announcement_id) || {
        total: 0,
        unread: 0,
        latestAt: null,
      };
      stat.unread = item._count._all;
      statsMap.set(item.announcement_id, stat);
    });

    const announcements = records.map((record) => mapAnnouncement(record, statsMap.get(record.id) ?? null));
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

    const stats = await prisma.announcement_replies.aggregate({
      _count: { _all: true },
      _max: { created_at: true },
      where: { announcement_id: record.id },
    });
    const unread = await prisma.announcement_replies.count({
      where: { announcement_id: record.id, read_at: null },
    });

    const replyStats = {
      total: stats._count?._all ?? 0,
      unread,
      latestAt: stats._max?.created_at ?? null,
    };

    return res.json({ success: true, announcement: mapAnnouncement(record, replyStats) });
  } catch (err) {
    console.error('admin announcement detail error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

router.get('/:id/replies', async (req, res) => {
  try {
    const { id } = req.params;
    const announcementId = Number(id);
    if (!id || Number.isNaN(announcementId)) {
      return res.status(400).json({ success: false, message: 'ID thông báo không hợp lệ' });
    }

    const announcement = await prisma.announcements.findUnique({ where: { id: announcementId } });
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
    }

    const { authorType, authorCode, unreadOnly } = req.query ?? {};
    const options = {};
    if (authorType) options.authorType = String(authorType);
    if (authorCode) options.authorCode = String(authorCode);
    if (typeof unreadOnly === 'string' && unreadOnly.toLowerCase() === 'true') {
      options.onlyUnread = true;
    }

    const replies = await ThongBaoModel.getRepliesByAnnouncement(announcementId, options);

    return res.json({ success: true, data: replies });
  } catch (error) {
    console.error('admin announcement replies error:', error);
    return res.status(500).json({ success: false, message: 'Không thể lấy phản hồi' });
  }
});

router.post('/:id/replies/read', async (req, res) => {
  try {
    const { id } = req.params;
    const announcementId = Number(id);
    if (!id || Number.isNaN(announcementId)) {
      return res.status(400).json({ success: false, message: 'ID thông báo không hợp lệ' });
    }

    const { replyIds } = req.body ?? {};
    const ids = Array.isArray(replyIds)
      ? replyIds
          .map((value) => {
            const num = Number(value);
            return Number.isNaN(num) ? null : num;
          })
          .filter((value) => value != null)
      : [];

    const updated = await ThongBaoModel.markRepliesAsRead(announcementId, ids.length ? ids : null);

    return res.json({ success: true, data: { updated } });
  } catch (error) {
    console.error('admin announcement replies mark read error:', error);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật trạng thái phản hồi' });
  }
});

router.put('/:id', async (req, res) => {
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
      allowReply,
      replyUntil,
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
      allow_reply: Boolean(allowReply),
      reply_until: parseNullableDate(replyUntil),
    };

    const updated = await prisma.announcements.update({ where: { id: record.id }, data: payload });

    return res.json({ success: true, announcement: mapAnnouncement(updated) });
  } catch (err) {
    console.error('admin announcement update error:', err);
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
      allowReply,
      replyUntil,
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
      allow_reply: Boolean(allowReply),
      reply_until: parseNullableDate(replyUntil),
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
