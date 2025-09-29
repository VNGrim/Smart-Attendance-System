const db = require("../../config/db.js"); // Updated path to reflect new db.js location

exports.findAdminById = async (adminId, password) => {
  const [rows] = await db.query(
    "SELECT * FROM users WHERE user_code = ? AND password = ? AND role = 'admin'",
    [adminId, password]
  );
  return rows[0]; // trả về 1 user
};