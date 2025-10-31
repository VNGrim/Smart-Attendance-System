const fs = require('fs/promises');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const dumpsDir = path.resolve(__dirname, 'dumps');

const TABLES = [
  { name: 'accounts', file: 'qlsv_accounts.sql', sequenceColumn: 'id' },
  { name: 'students', file: 'qlsv_students.sql' },
  { name: 'teachers', file: 'qlsv_teachers.sql' },
  { name: 'time_slots', file: 'qlsv_time_slots.sql' },
  { name: 'classes', file: 'qlsv_classes.sql' },
  { name: 'timetable', file: 'qlsv_timetable.sql', sequenceColumn: 'id' },
  { name: 'attendance_sessions', file: 'qlsv_attendance_sessions.sql', sequenceColumn: 'id' },
  { name: 'attendance_records', file: 'qlsv_attendance_records.sql', sequenceColumn: 'id' },
  { name: 'rooms', file: 'qlsv_rooms.sql', sequenceColumn: 'room_id' },
  { name: 'room_availability', file: 'qlsv_room_availability.sql', sequenceColumn: 'id' },
  { name: 'teacher_availability', file: 'qlsv_teacher_availability.sql', sequenceColumn: 'id' },
  { name: 'cohorts', file: 'qlsv_cohorts.sql', sequenceColumn: 'id' },
  { name: 'announcements', file: 'qlsv_announcements.sql', sequenceColumn: 'id' },
  { name: 'semester_attendance_stats', file: 'qlsv_semester_attendance_stats.sql', sequenceColumn: 'id' },
];

const COLUMN_OVERRIDES = {
  students: [
    'student_id',
    'full_name',
    'course',
    'classes',
    'account_id',
    'created_at',
    'major',
    'advisor_name',
    'email',
    'phone',
    'avatar_url',
    'status',
    'updated_at',
  ],
  teachers: [
    'teacher_id',
    'full_name',
    'subject',
    'classes',
    'account_id',
    'created_at',
    'email',
    'faculty',
    'phone',
    'status',
    'updated_at',
  ],
  announcements: [
    'id',
    'title',
    'content',
    'created_at',
    'category',
    'code',
    'history',
    'recipients',
    'scheduled_at',
    'send_time',
    'sender',
    'status',
    'target',
    'type',
    'updated_at',
  ],
  classes: [
    'class_id',
    'class_name',
    'subject_code',
    'subject_name',
    'cohort',
    'major',
    'teacher_id',
    'status',
    'room',
    'schedule',
    'semester',
    'school_year',
    'description',
    'created_at',
    'updated_at',
  ],
  attendance_sessions: [
    'id',
    'class_id',
    'slot_id',
    'day',
    'code',
    'expires_at',
    'type',
    'status',
    'attempts',
    'created_at',
    'updated_at',
  ],
  attendance_records: [
    'id',
    'session_id',
    'student_id',
    'status',
    'marked_at',
    'note',
  ],
  rooms: [
    'room_id',
    'code',
    'name',
    'capacity',
    'location',
    'notes',
    'created_at',
    'updated_at',
  ],
  room_availability: [
    'id',
    'room_code',
    'day_of_week',
    'slot_id',
    'is_available',
  ],
  teacher_availability: [
    'id',
    'teacher_id',
    'day_of_week',
    'slot_id',
    'is_available',
  ],
  cohorts: [
    'id',
    'code',
    'year',
    'created_at',
  ],
  time_slots: [
    'slot_id',
    'start_time',
    'end_time',
  ],
  timetable: [
    'id',
    'classes',
    'day_of_week',
    'slot_id',
    'room',
    'week_key',
    'teacher_id',
    'teacher_name',
    'subject_name',
    'room_name',
  ],
  semester_attendance_stats: [
    'id',
    'code',
    'name',
    'total_students',
    'attendance_ratio',
    'updated_at',
  ],
};

function extractInsertStatements(sql) {
  const statements = [];
  const regex = /INSERT\s+INTO\s+`?(\w+)`?\s+VALUES\s+([^;]+);/gims;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    const table = match[1];
    const normalized = match[0].replace(/`/g, '"');
    statements.push({ table, sql: normalized });
  }
  return statements;
}

function applyColumnOverride(table, statement) {
  const columns = COLUMN_OVERRIDES[table];
  if (!columns) {
    return statement;
  }

  return statement.replace(/INSERT\s+INTO\s+"?(\w+)"?\s+VALUES/i, (_match, tbl) => {
    const columnList = columns.map((col) => `"${col}"`).join(', ');
    return `INSERT INTO "${tbl}" (${columnList}) VALUES`;
  });
}

async function truncateTables() {
  const names = TABLES.map((t) => `"${t.name}"`).reverse();
  for (const table of names) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
  }
}

async function resetSequence(table, column) {
  if (!column) return;
  const sql = `SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'), COALESCE((SELECT MAX("${column}") FROM "${table}"), 0), true);`;
  await prisma.$executeRawUnsafe(sql);
}

async function importTable({ name, file, sequenceColumn }) {
  const filePath = path.join(dumpsDir, file);
  const content = await fs.readFile(filePath, 'utf8');
  const statements = extractInsertStatements(content);
  if (!statements.length) {
    console.warn(`[${name}] No INSERT statements found, skipping.`);
    return;
  }

  for (const { sql: rawSql, table } of statements) {
    const statement = applyColumnOverride(table, rawSql);
    await prisma.$executeRawUnsafe(statement);
  }

  await resetSequence(name, sequenceColumn);
  console.log(`[${name}] Imported ${statements.length} statement(s).`);
}

async function main() {
  try {
    console.log('🔄 Truncating existing tables...');
    await truncateTables();

    for (const table of TABLES) {
      console.log(`➡️  Importing ${table.name} from ${table.file}`);
      await importTable(table);
    }

    console.log('✅ Import completed successfully.');
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
