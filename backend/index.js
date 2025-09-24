const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 8080;

app.use(cors());
app.use(bodyParser.json());

// Fake dữ liệu tạm
const users = [
  { id: "SV001", password: "123456", role: "student" },
  { id: "GV001", password: "123456", role: "teacher" },
];

// API login
app.post("/api/auth/login", (req, res) => {
  const { studentId, password } = req.body;
  const user = users.find((u) => u.id === studentId && u.password === password);

  if (user) {
    res.json({ success: true, role: user.role, message: "Login success" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// API xem danh sách lớp
app.get("/api/classes", (req, res) => {
  res.json([
    { id: "C01", name: "Lập trình Web" },
    { id: "C02", name: "Cơ sở dữ liệu" },
  ]);
});

// Chạy server
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});