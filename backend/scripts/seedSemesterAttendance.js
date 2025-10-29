const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const prisma = require('../src/config/prisma');

const SAMPLE_SEMESTERS = [
  { code: 'K18', name: 'Khoá K18', totalStudents: 2150, attendanceRatio: 0.91 },
  { code: 'K19', name: 'Khoá K19', totalStudents: 2080, attendanceRatio: 0.88 },
  { code: 'K20', name: 'Khoá K20', totalStudents: 1985, attendanceRatio: 0.9 },
  { code: 'K21', name: 'Khoá K21', totalStudents: 1870, attendanceRatio: 0.93 },
];

const INITIAL_COHORTS = [
  { code: 'K18', year: 2018 },
  { code: 'K19', year: 2019 },
];

async function main() {
  for (const cohort of INITIAL_COHORTS) {
    await prisma.cohorts.upsert({
      where: { code: cohort.code },
      update: { year: cohort.year },
      create: { code: cohort.code, year: cohort.year },
    });
  }

  for (const item of SAMPLE_SEMESTERS) {
    await prisma.semester_attendance_stats.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        total_students: item.totalStudents,
        attendance_ratio: item.attendanceRatio,
        updated_at: new Date(),
      },
      create: {
        code: item.code,
        name: item.name,
        total_students: item.totalStudents,
        attendance_ratio: item.attendanceRatio,
      },
    });
  }

  console.log(`Seeded ${INITIAL_COHORTS.length} cohorts and ${SAMPLE_SEMESTERS.length} semester attendance rows.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
