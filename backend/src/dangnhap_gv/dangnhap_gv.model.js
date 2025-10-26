const prisma = require("../config/prisma");

exports.findTeacherById = async (teacherId, password) => {
  const rows = await prisma.$queryRaw`
    SELECT * FROM users WHERE user_code = ${teacherId} AND password = ${password} AND role = 'teacher'
  `;
  return rows[0]; // trả về 1 user
};