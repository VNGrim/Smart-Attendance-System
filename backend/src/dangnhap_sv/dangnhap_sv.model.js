const prisma = require("../config/prisma");

exports.findStudentById = async (studentId, password) => {
  const rows = await prisma.$queryRaw`
    SELECT * FROM users WHERE user_code = ${studentId} AND password = ${password} AND role = 'student'
  `;
  return rows[0]; // trả về 1 user
};
