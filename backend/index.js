const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./src/config/db"); // Import cấu hình database

const app = express();
const PORT = 8080;

app.use(cors());
app.use(bodyParser.json());

// Mount lichhoc_hienthi routes
const lichhocRoutes = require("./src/lichhoc_hienthi/lichhoc_hienthi.routes");
app.use("/api/lichhoc", lichhocRoutes);

// Mount thongbao_hienthi routes
const thongbaoRoutes = require("./src/thongbao_hienthi/thongbao_hienthi.routes");
app.use("/api/thongbao", thongbaoRoutes);

// Mount lop_gv routes
const lopRoutes = require("./src/lop_gv/lop_gv.routes");
app.use("/api/lop", lopRoutes);

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
      teacher_id: userInfo.teacher_id || account.user_code,
      full_name: userInfo.full_name || account.user_code,
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