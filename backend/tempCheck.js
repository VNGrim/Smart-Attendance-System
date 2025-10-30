const prisma = require("./src/config/prisma");

(async () => {
  try {
    await prisma.$connect();
    const accounts = await prisma.accounts.findMany({ take: 5 });
    console.log("Accounts:", accounts);
    const teachers = await prisma.teachers.findMany({ take: 5 });
    console.log("Teachers:", teachers);
    const classes = await prisma.classes.findMany({ take: 5 });
    console.log("Classes:", classes);
  } catch (error) {
    console.error("Error querying DB", error);
  } finally {
    await prisma.$disconnect();
  }
})();
