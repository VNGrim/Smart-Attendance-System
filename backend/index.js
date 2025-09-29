const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./src/config/db"); // Import cấu hình database

const app = express();
const PORT = 8080;

app.use(cors());
app.use(bodyParser.json());

// API đăng nhập chung - sử dụng database
app.post("/api/auth/login", async (req, res) => {
  const { userId, password } = req.body; 
  
  // Kiểm tra input
  if (!userId || !password) {
    return res.status(400).json({ 
      success: false, 
      message: "Vui lòng nhập đầy đủ mã đăng nhập và mật khẩu" 
    });
  }

  try {
    // Query database để tìm user
    const [accounts] = await db.execute(
      "SELECT * FROM accounts WHERE user_code = ? AND password = ?",
      [userId, password]
    );

    if (accounts.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: "Mã đăng nhập hoặc mật khẩu không đúng" 
      });
    }

    const account = accounts[0];
    let userInfo = {};

    // Lấy thông tin chi tiết theo role
    if (account.role === 'student') {
      const [students] = await db.execute(
        "SELECT * FROM students WHERE student_id = ?",
        [userId]
      );
      userInfo = students[0] || {};
    } else if (account.role === 'teacher') {
      const [teachers] = await db.execute(
        "SELECT * FROM teachers WHERE teacher_id = ?",
        [userId]
      );
      userInfo = teachers[0] || {};
    }

    res.json({ 
      success: true, 
      role: account.role, 
      userId: account.user_code,
      name: userInfo.full_name || account.user_code,
      message: `Đăng nhập thành công với quyền ${account.role}` 
    });

  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi hệ thống. Vui lòng thử lại sau." 
    });
  }
});

// API thông báo cho sinh viên - sử dụng database
app.get("/api/thongbao", async (req, res) => {
  try {
    // Query database để lấy thông báo
    const [announcements] = await db.execute(
      "SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC"
    );
    
    // Format dữ liệu trả về
    const notifications = announcements.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      date: announcement.created_at.toISOString().split('T')[0], // Format YYYY-MM-DD
      type: "general" // Mặc định type là general
    }));
    
    res.json({
      success: true,
      data: notifications,
      message: "Lấy danh sách thông báo thành công"
    });

  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống. Không thể lấy danh sách thông báo."
    });
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