const mysql = require("mysql2");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from db.env (đường dẫn tương đối từ src/config/)
dotenv.config({ path: path.join(__dirname, '../../db.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "111111",
  database: process.env.DB_NAME || "qlsv",
});

module.exports = pool.promise();
