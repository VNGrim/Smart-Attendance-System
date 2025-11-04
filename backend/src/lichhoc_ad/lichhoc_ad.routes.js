const express = require("express");
const prisma = require("../config/prisma");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);
const { Parser } = require("json2csv");
const { parse, isValid, startOfWeek, format: formatDate, endOfWeek, addDays } = require("date-fns");

const WEEK_START_OPTS = { weekStartsOn: 1, firstWeekContainsDate: 4 };

const router = express.Router();
router.use(auth, requireRole("admin"));

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_IDS = [1, 2, 3, 4];

function toDateOnly(date) {
  if (!(date instanceof Date)) return null;
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function normalizeToWeekStart(date) {
  return toDateOnly(startOfWeek(date, WEEK_START_OPTS));
}

function weekKeyFromDate(date) {
  return formatDate(normalizeToWeekStart(date), "RRRR-'W'II");
}

function tryParseDateOnly(value) {
  if (!value || (typeof value === "string" && !value.trim())) return null;
  const input = typeof value === "string" ? value.trim() : value;
  const patterns = ["yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy"];
  for (const pattern of patterns) {
    const parsed = parse(input, pattern, new Date());
    if (isValid(parsed)) return toDateOnly(parsed);
  }
  const fallback = new Date(input);
  if (isValid(fallback)) return toDateOnly(fallback);
  return null;
}

function resolveWeekStartFromKey(key) {
  const normalized = normalizeWeekKey(key);
  if (normalized === "UNASSIGNED") return null;
  const parsed = parse(normalized, "RRRR-'W'II", new Date());
  if (!isValid(parsed)) return null;
  return normalizeToWeekStart(parsed);
}

function computeDateFromWeekDay(weekKey, day) {
  const start = resolveWeekStartFromKey(weekKey);
  if (!start) return null;
  const normalizedDay = normalizeDay(day);
  const index = DAY_ORDER.indexOf(normalizedDay);
  if (index < 0) return null;
  return toDateOnly(addDays(start, index));
}

function resolveScheduleDate({ weekKey, day, dateInput }) {
  const provided = tryParseDateOnly(dateInput);
  if (provided) return provided;
  return computeDateFromWeekDay(weekKey, day);
}

function toISODateString(date) {
  if (!date) return null;
  return formatDate(date, "yyyy-MM-dd");
}

function normalizeDay(value) {
  if (!value) return "Mon";
  const str = String(value).trim();
  const upper = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  return DAY_ORDER.includes(upper) ? upper : "Mon";
}

function formatTime(value) {
  if (!value) return null;
  return dayjs(value).utc().format("HH:mm");
}

function normalizeWeekKey(value) {
  if (!value) return "UNASSIGNED";
  const str = String(value).trim();
  if (!str) return "UNASSIGNED";

  const parsedIso = parse(str, "RRRR-'W'II", new Date());
  if (isValid(parsedIso)) {
    return weekKeyFromDate(parsedIso);
  }

  const parsedDate = parse(str, "yyyy-MM-dd", new Date());
  if (isValid(parsedDate)) {
    return weekKeyFromDate(parsedDate);
  }

  const rangeMatch = str.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (rangeMatch) {
    const day = rangeMatch[1];
    const month = rangeMatch[2];
    const year = rangeMatch[3] ? rangeMatch[3].padStart(4, "20") : String(new Date().getFullYear());
    const composed = `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    const parsedRangeDate = parse(composed, "dd/MM/yyyy", new Date());
    if (isValid(parsedRangeDate)) {
      return weekKeyFromDate(parsedRangeDate);
    }
  }

  return str.toUpperCase();
}

function buildEmptyGrid() {
  const grid = {};
  SLOT_IDS.forEach((slot) => {
    grid[slot] = {};
    DAY_ORDER.forEach((day) => {
      grid[slot][day] = null;
    });
  });
  return grid;
}

async function getClasses() {
  try {
    const rows = await prisma.classes.findMany({
      select: {
        class_id: true,
        class_name: true,
        subject_name: true,
        teacher_id: true,
        teacher: { select: { full_name: true } },
      },
      orderBy: { class_name: "asc" },
    });
    return rows.map((row) => ({
      id: row.class_id,
      name: row.class_name,
      subject: row.subject_name,
      teacherId: row.teacher_id,
      teacherName: row.teacher?.full_name || null,
    }));
  } catch (error) {
    console.warn("classes table missing", error?.message);
    return [];
  }
}

async function getTeachers() {
  try {
    const rows = await prisma.teachers.findMany({
      select: { teacher_id: true, full_name: true, subject: true },
      orderBy: { full_name: "asc" },
    });
    return rows.map((t) => ({ id: t.teacher_id, name: t.full_name, subject: t.subject }));
  } catch (error) {
    console.warn("teachers table missing", error?.message);
    return [];
  }
}

async function getRooms() {
  try {
    const rows = await prisma.rooms.findMany({
      orderBy: { code: "asc" },
    });
    return rows.map((r) => ({
      code: r.code,
      name: r.name || r.code,
      capacity: r.capacity || null,
      location: r.location || null,
    }));
  } catch (error) {
    console.warn("rooms table missing", error?.message);
    return [];
  }
}

async function loadWeekSchedule(weekKey) {
  const key = normalizeWeekKey(weekKey);

  const rows = await prisma.timetable.findMany({
    where: { week_key: key },
    orderBy: [
      { date: "asc" },
      { day_of_week: "asc" },
      { slot_id: "asc" },
      { classes: "asc" },
    ],
    include: {
      time_slots: true,
    },
  });

  const grid = buildEmptyGrid();
  const flat = rows.map((row) => {
    const dayKey = normalizeDay(row.day_of_week);
    const slotId = Number(row.slot_id);
    const startTime = formatTime(row.time_slots?.start_time);
    const endTime = formatTime(row.time_slots?.end_time);
    const computedDate = row.date ? toDateOnly(row.date) : computeDateFromWeekDay(row.week_key, row.day_of_week);
    const isoDate = computedDate ? toISODateString(computedDate) : null;

    if (SLOT_IDS.includes(slotId)) {
      grid[slotId][dayKey] = {
        classId: row.classes,
        className: row.subject_name || row.classes,
        subjectName: row.subject_name || row.classes,
        teacherName: row.teacher_name || "",
        room: row.room_name || row.room || "",
        startTime,
        endTime,
        date: isoDate,
      };
    }
    return {
      id: row.id,
      week_key: row.week_key,
      day: dayKey,
      slot_id: slotId,
      start_time: startTime,
      end_time: endTime,
      room: row.room || "",
      room_name: row.room_name || row.room || "",
      class_id: row.classes,
      class_name: row.subject_name || row.classes,
      subject_name: row.subject_name || row.classes,
      teacher_id: row.teacher_id || "",
      teacher_name: row.teacher_name || "",
      date: isoDate,
    };
  });

  return { grid, flat };
}

function validateSlot(slotId) {
  return SLOT_IDS.includes(Number(slotId));
}

function ensureNotConflict(records, candidate) {
  return !records.some((item) => {
    const sameSlotByDate = item.date && candidate.date
      ? item.date === candidate.date && item.slot_id === candidate.slot_id
      : false;

    const sameSlotByWeek = item.week_key === candidate.week_key && item.day === candidate.day && item.slot_id === candidate.slot_id;

    if (!sameSlotByDate && !sameSlotByWeek) return false;

    if (item.class_id === candidate.class_id) return true;
    if (candidate.teacher_id && item.teacher_id && item.teacher_id === candidate.teacher_id) return true;
    if (item.room && candidate.room && item.room === candidate.room) return true;
    return false;
  });
}

router.get("/options", async (req, res) => {
  try {
    const [classes, teachers, rooms] = await Promise.all([
      getClasses(),
      getTeachers(),
      getRooms(),
    ]);
    return res.json({ success: true, data: { classes, teachers, rooms, days: DAY_ORDER, slots: SLOT_IDS } });
  } catch (error) {
    console.error("schedule options error", error);
    return res.status(500).json({ success: false, message: "Không thể lấy dữ liệu tùy chọn" });
  }
});

router.get("/schedule", async (req, res) => {
  try {
    const { week = "UNASSIGNED" } = req.query;
    const data = await loadWeekSchedule(week);
    return res.json({ success: true, data });
  } catch (error) {
    console.error("admin schedule fetch error:", error);
    return res.status(500).json({ success: false, message: "Không thể lấy dữ liệu lịch học" });
  }
});

router.post("/schedule", async (req, res) => {
  try {
    const { weekKey, day, slotId, classId, subjectName, teacherId, teacherName, room, roomName, date: dateInput } = req.body;
    const day_of_week = normalizeDay(day);
    const scheduleDate = resolveScheduleDate({ weekKey, day: day_of_week, dateInput });
    const week_key = scheduleDate ? weekKeyFromDate(scheduleDate) : normalizeWeekKey(weekKey);

    if (!validateSlot(slotId)) {
      return res.status(400).json({ success: false, message: "Slot không hợp lệ" });
    }
    if (!classId) {
      return res.status(400).json({ success: false, message: "Thiếu mã lớp" });
    }

    const baseConflict = {
      AND: [
        { week_key },
        { day_of_week },
        { slot_id: Number(slotId) },
        {
          OR: [
            { classes: classId },
            teacherId ? { teacher_id: teacherId } : { id: -1 },
            room ? { room } : { id: -1 },
          ],
        },
      ],
    };

    const conflicts = [baseConflict];
    if (scheduleDate) {
      conflicts.push({
        AND: [
          { date: scheduleDate },
          { slot_id: Number(slotId) },
          {
            OR: [
              { classes: classId },
              teacherId ? { teacher_id: teacherId } : { id: -1 },
              room ? { room } : { id: -1 },
            ],
          },
        ],
      });
    }

    const existing = await prisma.timetable.findFirst({ where: { OR: conflicts } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Đã có lịch trùng (lớp/giảng viên/phòng)" });
    }

    const created = await prisma.timetable.create({
      data: {
        week_key,
        day_of_week,
        slot_id: Number(slotId),
        classes: classId,
        subject_name: subjectName || null,
        teacher_id: teacherId || null,
        teacher_name: teacherName || null,
        room: room || "",
        room_name: roomName || room || null,
        date: scheduleDate || null,
      },
      include: { time_slots: true },
    });

    return res.json({ success: true, data: { ...created, date: created.date ? toISODateString(toDateOnly(created.date)) : null } });
  } catch (error) {
    console.error("create schedule error", error);
    return res.status(500).json({ success: false, message: "Không thể tạo lịch" });
  }
});

router.delete("/schedule/week", async (req, res) => {
  try {
    const { week } = req.query;
    if (!week) {
      return res.status(400).json({ success: false, message: "Thiếu tuần" });
    }
    const week_key = normalizeWeekKey(week);
    const deleted = await prisma.timetable.deleteMany({ where: { week_key } });
    return res.json({ success: true, data: { count: deleted.count } });
  } catch (error) {
    console.error("delete week error", error);
    return res.status(500).json({ success: false, message: "Không thể xóa lịch tuần" });
  }
});

router.post("/schedule/copy", async (req, res) => {
  try {
    const { fromWeek, toWeek } = req.body;
    if (!fromWeek || !toWeek) {
      return res.status(400).json({ success: false, message: "Thiếu tuần nguồn hoặc tuần đích" });
    }
    const from = normalizeWeekKey(fromWeek);
    const to = normalizeWeekKey(toWeek);
    if (from === to) {
      return res.status(400).json({ success: false, message: "Tuần sao chép trùng nhau" });
    }

    const source = await prisma.timetable.findMany({ where: { week_key: from } });
    if (!source.length) {
      return res.status(404).json({ success: false, message: "Tuần nguồn không có dữ liệu" });
    }

    const conflicts = await prisma.timetable.findMany({ where: { week_key: to } });
    if (conflicts.length) {
      return res.status(409).json({ success: false, message: "Tuần đích đã có dữ liệu, xóa trước khi sao chép" });
    }

    await prisma.$transaction(
      source.map((item) =>
        prisma.timetable.create({
          data: {
            week_key: to,
            day_of_week: item.day_of_week,
            slot_id: item.slot_id,
            classes: item.classes,
            subject_name: item.subject_name,
            teacher_id: item.teacher_id,
            teacher_name: item.teacher_name,
            room: item.room,
            room_name: item.room_name,
          },
        })
      )
    );

    return res.json({ success: true });
  } catch (error) {
    console.error("copy week error", error);
    return res.status(500).json({ success: false, message: "Không thể sao chép lịch" });
  }
});

async function getAvailabilityData() {
  const [teacherAvail, roomAvail] = await Promise.all([
    prisma.teacher_availability.findMany(),
    prisma.room_availability.findMany(),
  ]);
  const teacherMap = new Map();
  teacherAvail.forEach((row) => {
    const key = `${row.teacher_id}-${row.day_of_week}-${row.slot_id}`;
    teacherMap.set(key, row.is_available);
  });
  const roomMap = new Map();
  roomAvail.forEach((row) => {
    const key = `${row.room_code}-${row.day_of_week}-${row.slot_id}`;
    roomMap.set(key, row.is_available);
  });
  return { teacherMap, roomMap };
}

function pickAvailableSlots(classes, teacherMap, roomMap, existing, week_key) {
  const plan = [];
  const occupied = existing.flat.map((item) => ({
    week_key: item.week_key || week_key,
    day: item.day,
    slot_id: item.slot_id,
    class_id: item.class_id,
    teacher_id: item.teacher_id,
    room: item.room,
    date: item.date || null,
  }));
  const rooms = classes.reduce((acc, cls) => {
    if (cls.room) acc.add(cls.room);
    return acc;
  }, new Set());

  const roomList = rooms.size ? Array.from(rooms) : null;
  const allRooms = roomList || [];

  classes.forEach((cls) => {
    const teacherId = cls.teacherId || cls.teacher_id;
    const candidates = [];
    DAY_ORDER.forEach((day) => {
      SLOT_IDS.forEach((slot) => {
        const teacherKey = teacherId ? `${teacherId}-${day}-${slot}` : null;
        if (teacherKey && teacherMap.size && teacherMap.get(teacherKey) === false) return;
        if (teacherKey && teacherMap.size && !teacherMap.has(teacherKey)) return;

        let roomCode = cls.room || null;
        if (roomCode) {
          const roomKey = `${roomCode}-${day}-${slot}`;
          if (roomMap.size && roomMap.get(roomKey) === false) return;
        } else if (roomMap.size) {
          const availableRoom = allRooms.find((code) => {
            const rk = `${code}-${day}-${slot}`;
            return roomMap.get(rk) !== false;
          });
          roomCode = availableRoom || null;
        }

        const candidateDate = resolveScheduleDate({ weekKey: week_key, day, dateInput: null });
        const isoDate = candidateDate ? toISODateString(candidateDate) : null;
        const candidate = {
          class_id: cls.id,
          class_name: cls.name,
          subject_name: cls.subject,
          teacher_id: teacherId || null,
          teacher_name: cls.teacherName || null,
          room: roomCode,
          day,
          slot_id: slot,
          week_key,
          date: isoDate,
        };

        if (ensureNotConflict(occupied, { ...candidate, week_key })) {
          candidates.push(candidate);
        }
      });
    });
    if (candidates.length) {
      const best = candidates[0];
      plan.push(best);
      occupied.push({ ...best });
    }
  });

  return plan;
}

router.post("/schedule/auto", async (req, res) => {
  try {
    const { weekKey, classIds = [] } = req.body;
    if (!weekKey || !Array.isArray(classIds) || !classIds.length) {
      return res.status(400).json({ success: false, message: "Thiếu tuần hoặc danh sách lớp" });
    }
    const week_key = normalizeWeekKey(weekKey);

    const [classes, teachers, rooms, weekData, availability] = await Promise.all([
      prisma.classes.findMany({
        where: { class_id: { in: classIds } },
        include: { teacher: true },
      }),
      getTeachers(),
      getRooms(),
      loadWeekSchedule(week_key),
      getAvailabilityData(),
    ]);

    if (!classes.length) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    }

    const formattedClasses = classes.map((cls) => ({
      id: cls.class_id,
      name: cls.class_name,
      subject: cls.subject_name,
      teacherId: cls.teacher_id || null,
      teacherName: cls.teacher?.full_name || null,
      room: cls.room || null,
    }));

    const plan = pickAvailableSlots(
      formattedClasses,
      availability.teacherMap,
      availability.roomMap,
      weekData.flat,
      week_key
    );

    const normalizedPlan = plan.map((item) => ({
      ...item,
      date: item.date || toISODateString(resolveScheduleDate({ weekKey: week_key, day: item.day, dateInput: null })) || null,
    }));

    return res.json({ success: true, data: { plan: normalizedPlan, classes: formattedClasses, teachers, rooms, current: weekData } });
  } catch (error) {
    console.error("auto schedule error", error);
    return res.status(500).json({ success: false, message: "Không thể tạo gợi ý" });
  }
});

router.post("/schedule/auto/apply", async (req, res) => {
  try {
    const { weekKey, allocations } = req.body;
    if (!weekKey || !Array.isArray(allocations) || !allocations.length) {
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu phân bổ" });
    }
    const week_key = normalizeWeekKey(weekKey);

    const createInputs = allocations
      .filter((item) => validateSlot(item.slot_id))
      .map((item) => {
        const day_of_week = normalizeDay(item.day);
        const scheduleDate = resolveScheduleDate({ weekKey, day: day_of_week, dateInput: item.date });
        const targetWeekKey = scheduleDate ? weekKeyFromDate(scheduleDate) : week_key;
        return {
          week_key: targetWeekKey,
          day_of_week,
          slot_id: Number(item.slot_id),
          classes: item.class_id,
          subject_name: item.subject_name || null,
          teacher_id: item.teacher_id || null,
          teacher_name: item.teacher_name || null,
          room: item.room || "",
          room_name: item.room_name || item.room || null,
          date: scheduleDate || null,
        };
      });

    if (!createInputs.length) {
      return res.status(400).json({ success: false, message: "Không có lịch hợp lệ" });
    }

    const conflictConditions = createInputs.flatMap((item) => {
      const clashTargets = [
        { classes: item.classes },
        item.teacher_id ? { teacher_id: item.teacher_id } : { id: -1 },
        item.room ? { room: item.room } : { id: -1 },
      ];

      const checks = [
        {
          AND: [
            { week_key: item.week_key },
            { day_of_week: item.day_of_week },
            { slot_id: item.slot_id },
            { OR: clashTargets },
          ],
        },
      ];

      if (item.date) {
        checks.push({
          AND: [
            { date: item.date },
            { slot_id: item.slot_id },
            { OR: clashTargets },
          ],
        });
      }

      return checks;
    });

    const conflicts = conflictConditions.length
      ? await prisma.timetable.findMany({ where: { OR: conflictConditions } })
      : [];

    if (conflicts.length) {
      return res.status(409).json({
        success: false,
        message: "Có lịch trùng, vui lòng kiểm tra lại",
        data: { conflicts },
      });
    }

    await prisma.$transaction(createInputs.map((data) => prisma.timetable.create({ data })));

    const updated = await loadWeekSchedule(week_key);
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("apply auto schedule error", error);
    return res.status(500).json({ success: false, message: "Không thể áp dụng lịch" });
  }
});

router.get("/schedule/export", async (req, res) => {
  try {
    const { week = "UNASSIGNED", format = "csv" } = req.query;
    const week_key = normalizeWeekKey(week);
    const data = await loadWeekSchedule(week_key);

    if (format === "csv") {
      const parser = new Parser({
        fields: [
          "week_key",
          "date",
          "day",
          "slot_id",
          "start_time",
          "end_time",
          "class_id",
          "class_name",
          "teacher_name",
          "room",
          "room_name",
        ],
      });
      const csv = parser.parse(
        data.flat.map((row) => ({
          ...row,
          start_time: row.start_time ? dayjs(row.start_time).format("HH:mm") : "",
          end_time: row.end_time ? dayjs(row.end_time).format("HH:mm") : "",
        }))
      );
      res.setHeader("Content-Disposition", `attachment; filename=schedule-${week_key}.csv`);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.send(csv);
    }

    return res.status(400).json({ success: false, message: "Định dạng chưa hỗ trợ" });
  } catch (error) {
    console.error("export schedule error", error);
    return res.status(500).json({ success: false, message: "Không thể xuất lịch" });
  }
});

module.exports = router;
