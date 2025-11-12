const prisma = require("../config/prisma");

exports.findTeacherById = async (teacherId, password) => {
  const rows = await prisma.$queryRaw`
    SELECT a.*, t.full_name
    FROM accounts a
    LEFT JOIN teachers t ON t.account_id = a.id
    WHERE a.user_code = ${teacherId} AND a.password = ${password} AND a.role = 'teacher'
  `;
  return rows[0]; // trả về 1 user, có full_name
};