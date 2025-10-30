const prisma = require("../config/prisma");

exports.findStudentById = async (studentId) => {
  try {
    return await prisma.accounts.findUnique({
      where: { user_code: studentId },
    });
  } catch (error) {
    console.error("❌ Lỗi findStudentById:", error);
    throw error;
  }
};
