const prisma = require("./src/config/prisma");

(async () => {
  try {
    await prisma.$connect();
    const rows = await prisma.timetable.findMany({
      where: { classes: "SE19B3" },
      take: 10,
    });
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
