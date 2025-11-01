const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const username = "admin";
  const password = "admin123";

  const hashed = await bcrypt.hash(password, 10);

  const account = await prisma.accounts.upsert({
    where: { user_code: username },
    update: { password: hashed, role: "admin" },
    create: { user_code: username, password: hashed, role: "admin" },
  });

  console.log("Seeded admin account:", {
    id: account.id,
    user_code: account.user_code,
    role: account.role,
  });
}

main()
  .catch((error) => {
    console.error("Failed to seed admin account:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
