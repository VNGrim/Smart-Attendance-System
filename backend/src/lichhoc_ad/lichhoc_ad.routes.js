const express = require("express");
const prisma = require("../config/prisma");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();
router.use(auth, requireRole("admin"));

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_IDS = [1, 2, 3, 4];

function normalizeDay(value) {
  if (!value) return "Mon";
  const str = String(value).trim();
  const upper = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  return DAY_ORDER.includes(upper) ? upper : "Mon";
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

router.get("/schedule", async (req, res) => {
  try {
    const [hasClassesTable] = await Promise.all([
      prisma.$queryRaw`SHOW TABLES LIKE 'classes'`
    ]);

    let rows;

    if (Array.isArray(hasClassesTable) && hasClassesTable.length > 0) {
      rows = await prisma.$queryRaw`
        SELECT t.day_of_week,
               t.slot_id,
               ts.start_time,
               ts.end_time,
               t.room,
               t.classes AS class_id,
               COALESCE(c.class_name, t.classes) AS class_name,
               COALESCE(c.subject_name, c.class_name, '') AS subject_name,
               COALESCE(c.teacher_id, '') AS teacher_id,
               COALESCE(tea.full_name, '') AS teacher_name
        FROM timetable t
        JOIN time_slots ts ON ts.slot_id = t.slot_id
        LEFT JOIN classes c ON c.class_id = t.classes
        LEFT JOIN teachers tea ON tea.teacher_id = c.teacher_id
        ORDER BY CASE t.day_of_week
                   WHEN 'Mon' THEN 1
                   WHEN 'Tue' THEN 2
                   WHEN 'Wed' THEN 3
                   WHEN 'Thu' THEN 4
                   WHEN 'Fri' THEN 5
                   WHEN 'Sat' THEN 6
                   WHEN 'Sun' THEN 7
                   ELSE 8
                 END,
                 t.slot_id,
                 COALESCE(c.class_id, t.classes);
      `;
    } else {
      rows = await prisma.$queryRaw`
        SELECT t.day_of_week,
               t.slot_id,
               ts.start_time,
               ts.end_time,
               t.room,
               t.classes AS class_id,
               t.classes AS class_name,
               t.classes AS subject_name,
               '' AS teacher_id,
               '' AS teacher_name
        FROM timetable t
        JOIN time_slots ts ON ts.slot_id = t.slot_id
        ORDER BY CASE t.day_of_week
                   WHEN 'Mon' THEN 1
                   WHEN 'Tue' THEN 2
                   WHEN 'Wed' THEN 3
                   WHEN 'Thu' THEN 4
                   WHEN 'Fri' THEN 5
                   WHEN 'Sat' THEN 6
                   WHEN 'Sun' THEN 7
                   ELSE 8
                 END,
                 t.slot_id,
                 t.classes;
      `;
    }

    const grid = buildEmptyGrid();

    const formatted = rows.map((row) => {
      const dayKey = normalizeDay(row.day_of_week);
      const slotId = Number(row.slot_id) || 0;
      if (SLOT_IDS.includes(slotId)) {
        grid[slotId][dayKey] = {
          classId: row.class_id,
          className: row.class_name || row.class_id || "",
          subjectName: row.subject_name || row.class_name || row.class_id || "",
          teacherName: row.teacher_name || "",
          room: row.room || "",
          startTime: row.start_time,
          endTime: row.end_time,
        };
      }
      return {
        day: dayKey,
        slot_id: slotId,
        start_time: row.start_time,
        end_time: row.end_time,
        room: row.room || "",
        class_id: row.class_id || "",
        class_name: row.class_name || row.class_id || "",
        subject_name: row.subject_name || row.class_name || row.class_id || "",
        teacher_id: row.teacher_id || "",
        teacher_name: row.teacher_name || "",
      };
    });

    return res.json({ success: true, data: { grid, flat: formatted } });
  } catch (error) {
    console.error("admin schedule fetch error:", error);
    return res.status(500).json({ success: false, message: "Không thể lấy dữ liệu lịch học" });
  }
});

module.exports = router;
