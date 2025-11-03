const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const COHORTS = [
  { code: "K18", year: 2022 },
  { code: "K19", year: 2023 },
  { code: "K20", year: 2024 },
  { code: "K21", year: 2025 },
];

async function main() {
  for (const cohort of COHORTS) {
    const record = await prisma.cohorts.upsert({
      where: { code: cohort.code },
      update: { year: cohort.year },
      create: {
        code: cohort.code,
        year: cohort.year,
      },
    });

    console.log(`Seeded cohort ${record.code} (year ${record.year})`);
  }
}

main()
  .catch((error) => {
    console.error("Failed to seed cohorts:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
