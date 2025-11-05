const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const COHORTS = [
  { code: "K18", year: 2022 },
  { code: "K19", year: 2023 },
  { code: "K20", year: 2024 },
  { code: "K21", year: 2025 },
];

async function seedAdminAccount() {
  const username = "admin";
  const password = "admin123";

  const hashed = await bcrypt.hash(password, 10);

  const account = await prisma.accounts.upsert({
    where: { user_code: username },
    update: { password: hashed, role: "admin" },
    create: { user_code: username, password: hashed, role: "admin" },
  });

  console.log("✅ Seeded admin account:", {
    id: account.id,
    user_code: account.user_code,
    role: account.role,
  });
}

async function seedCohorts() {
  for (const cohort of COHORTS) {
    const record = await prisma.cohorts.upsert({
      where: { code: cohort.code },
      update: { year: cohort.year },
      create: {
        code: cohort.code,
        year: cohort.year,
      },
    });

    console.log(`✅ Seeded cohort ${record.code} (${record.year})`);
  }
}

async function main() {
  await seedAdminAccount();
  await seedCohorts();
}

main()
  .catch((error) => {
    console.error("Failed to seed admin account:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
