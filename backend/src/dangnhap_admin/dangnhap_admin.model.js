const prisma = require("../config/prisma");

exports.findAdminById = async (adminId, password) => {
  const rows = await prisma.$queryRaw`
    SELECT * FROM users WHERE user_code = ${adminId} AND password = ${password} AND role = 'admin'
  `;
  return rows[0]; // trả về 1 user
};