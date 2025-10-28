const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), 'backend', '.env') });
const { PrismaClient } = require('@prisma/client');

let prisma;

if (!global.__prisma) {
  global.__prisma = new PrismaClient();
}

prisma = global.__prisma;

module.exports = prisma;
