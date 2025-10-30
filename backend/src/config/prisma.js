const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), 'backend', '.env') });
const { PrismaClient } = require('@prisma/client');

if (!global.__prisma) {
  global.__prisma = new PrismaClient();
}

const prisma = global.__prisma;

async function ensureTimeSlots() {
  const defaults = [
    { slot_id: 1, start: "07:00", end: "09:15" },
    { slot_id: 2, start: "09:30", end: "11:45" },
    { slot_id: 3, start: "12:30", end: "14:45" },
    { slot_id: 4, start: "15:00", end: "17:15" },
  ];

  const toDate = (timeString) => {
    const [hours, minutes] = timeString.split(":");
    return new Date(Date.UTC(1970, 0, 1, Number(hours), Number(minutes), 0));
  };

  await prisma.$transaction(
    defaults.map(({ slot_id, start, end }) =>
      prisma.time_slots.upsert({
        where: { slot_id },
        update: {
          start_time: toDate(start),
          end_time: toDate(end),
        },
        create: {
          slot_id,
          start_time: toDate(start),
          end_time: toDate(end),
        },
      })
    )
  );
}

if (!global.__prismaInit) {
  global.__prismaInit = ensureTimeSlots().catch((err) => {
    console.error('Failed to seed time_slots', err);
  });
}

prisma.$ready = global.__prismaInit;

module.exports = prisma;
