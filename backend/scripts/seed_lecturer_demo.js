const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');

(async () => {
  try {
    const TEACHER_ID = process.env.SEED_TEACHER_ID || null;
    const PASSWORD = process.env.SEED_TEACHER_PASSWORD || '123456';

    // 1) Pick or create a teacher
    let teacherId = TEACHER_ID;

    if (!teacherId) {
      const teachers = await prisma.$queryRaw`SELECT teacher_id FROM teachers LIMIT 1`;
      teacherId = teachers?.[0]?.teacher_id || null;
    }

    let fullName = 'Giảng viên Demo';

    if (!teacherId) {
      // Try to use an existing teacher account
      const accounts = await prisma.$queryRaw`SELECT user_code FROM accounts WHERE role = 'teacher' LIMIT 1`;
      const accUser = accounts?.[0]?.user_code;
      if (accUser) {
        teacherId = accUser;
        const rows = await prisma.$queryRaw`SELECT full_name FROM teachers WHERE teacher_id = ${teacherId}`;
        fullName = rows?.[0]?.full_name || fullName;
        if (!rows?.length) {
          await prisma.$executeRaw`INSERT INTO teachers (teacher_id, full_name, subject, status, created_at, updated_at) VALUES (${teacherId}, ${fullName}, 'Demo Subject', 'Đang dạy', NOW(), NOW())`;
        }
      }
    }

    if (!teacherId) {
      // Create demo account + teacher
      teacherId = 'TCH001';
      fullName = 'Nguyễn Văn Demo';

      const hashed = await bcrypt.hash(PASSWORD, 10);
      // Create account if not exists
      await prisma.$executeRaw`INSERT IGNORE INTO accounts (user_code, password, role) VALUES (${teacherId}, ${hashed}, 'teacher')`;
      // Create teacher if not exists
      await prisma.$executeRaw`INSERT IGNORE INTO teachers (teacher_id, full_name, subject, status, created_at, updated_at) VALUES (${teacherId}, ${fullName}, 'Lập trình Web', 'Đang dạy', NOW(), NOW())`;
    }

    console.log('Using teacher_id =', teacherId);

    // 2) Seed classes for this teacher
    const classes = [
      { class_id: 'CLC101', class_name: 'Lập trình Web 1', subject_code: 'WEB101', subject_name: 'Lập trình Web', semester: '1', school_year: '2024-2025' },
      { class_id: 'CLC102', class_name: 'Cơ sở dữ liệu', subject_code: 'DB101', subject_name: 'Cơ sở dữ liệu', semester: '1', school_year: '2024-2025' },
    ];

    for (const c of classes) {
      await prisma.$executeRaw`
        INSERT INTO classes (class_id, class_name, subject_code, subject_name, cohort, major, teacher_id, status, room, schedule, semester, school_year, description, created_at, updated_at)
        VALUES (${c.class_id}, ${c.class_name}, ${c.subject_code}, ${c.subject_name}, 'K67', 'CNTT', ${teacherId}, 'Đang hoạt động', 'A101', 'T2-3', ${c.semester}, ${c.school_year}, '', NOW(), NOW())
        ON DUPLICATE KEY UPDATE class_name = VALUES(class_name), subject_code = VALUES(subject_code), subject_name = VALUES(subject_name), teacher_id = VALUES(teacher_id), semester = VALUES(semester), school_year = VALUES(school_year), updated_at = NOW()`;
    }

    // 3) Seed students
    const students = [
      { student_id: 'SV001', full_name: 'Trần An' },
      { student_id: 'SV002', full_name: 'Lê Bình' },
      { student_id: 'SV003', full_name: 'Phạm Cường' },
      { student_id: 'SV004', full_name: 'Đỗ Duyên' },
      { student_id: 'SV005', full_name: 'Võ Em' },
    ];

    for (const s of students) {
      await prisma.$executeRaw`
        INSERT INTO students (student_id, full_name, course, status, created_at, updated_at)
        VALUES (${s.student_id}, ${s.full_name}, 'K67', 'active', NOW(), NOW())
        ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), updated_at = NOW()`;
    }

    // 4) Link students to classes via student_classes
    // Ensure table exists
    await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS `student_classes` (\n  `id` INT NOT NULL AUTO_INCREMENT,\n  `student_id` VARCHAR(20) NOT NULL,\n  `class_id` VARCHAR(20) NOT NULL,\n  `enrolled_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,\n  `status` VARCHAR(30) NULL DEFAULT \'enrolled\',\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `student_classes_unique` (`student_id`,`class_id`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;');

    const links = [
      ['SV001', 'CLC101'],
      ['SV002', 'CLC101'],
      ['SV003', 'CLC101'],
      ['SV003', 'CLC102'],
      ['SV004', 'CLC102'],
      ['SV005', 'CLC102'],
    ];

    for (const [sid, cid] of links) {
      await prisma.$executeRaw`INSERT IGNORE INTO student_classes (student_id, class_id, enrolled_at, status) VALUES (${sid}, ${cid}, NOW(), 'enrolled')`;
    }

    console.log('✅ Seed lecturer/classes/students done');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
})();
