const prisma = require('../src/config/prisma');

async function main() {
  const now = new Date();
  let offset = 0;
  const hourMs = 60 * 60 * 1000;

  const queue = [];

  const announcements = await prisma.announcements.findMany({ where: { created_at: null } });
  for (const ann of announcements) {
    queue.push(
      prisma.announcements.update({
        where: { id: ann.id },
        data: { created_at: new Date(now.getTime() - offset * hourMs) },
      })
    );
    offset += 1;
  }

  const students = await prisma.students.findMany({ where: { created_at: null } });
  for (const st of students) {
    queue.push(
      prisma.students.update({
        where: { student_id: st.student_id },
        data: { created_at: new Date(now.getTime() - offset * hourMs) },
      })
    );
    offset += 1;
  }

  const teachers = await prisma.teachers.findMany({ where: { created_at: null } });
  for (const tc of teachers) {
    queue.push(
      prisma.teachers.update({
        where: { teacher_id: tc.teacher_id },
        data: { created_at: new Date(now.getTime() - offset * hourMs) },
      })
    );
    offset += 1;
  }

  if (queue.length === 0) {
    console.log('No rows needed backfill.');
    return;
  }

  await prisma.$transaction(queue);
  console.log(`Backfilled created_at for ${queue.length} rows.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Backfill error:', err);
    prisma.$disconnect().finally(() => process.exit(1));
  });
