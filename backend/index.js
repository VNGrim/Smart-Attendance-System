const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const prisma = require("./src/config/prisma"); // Import cấu hình Prisma

const app = express();
const PORT = 8080;

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Mount lichhoc_hienthi routes
const lichhocRoutes = require("./src/lichhoc_hienthi/lichhoc_hienthi.routes");
app.use("/api/lichhoc", lichhocRoutes);

// Mount thongbao_hienthi routes
const thongbaoRoutes = require("./src/thongbao_hienthi/thongbao_hienthi.routes");
app.use("/api/thongbao", thongbaoRoutes);

// Mount thongbao_gv routes (Teacher notifications)
const thongbaoGVRoutes = require("./src/thongbao_gv/thongbao_gv.routes");
app.use("/api/teacher/notifications", thongbaoGVRoutes);

// Mount lop_gv routes
const lopRoutes = require("./src/lop_gv/lop_gv.routes");
app.use("/api/lop", lopRoutes);

// Auth & User routes (JWT + cookie)
const authRoutes = require("./src/routes/auth.routes");
const userRoutes = require("./src/routes/user.routes");
app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);

// Admin overview routes
const adminOverviewRoutes = require("./src/tongquan_ad/tongquan_ad.routes");
app.use("/api/admin/overview", adminOverviewRoutes);

// Admin announcements routes
const adminAnnouncementRoutes = require("./src/thongbao_ad/thongbao_ad.routes");
app.use("/api/admin/notifications", adminAnnouncementRoutes);

// Admin lecturers routes
const adminLecturerRoutes = require("./src/giangvien_ad/giangvien_ad.routes");
app.use("/api/admin/lecturers", adminLecturerRoutes);

// Admin classes routes
const adminClassRoutes = require("./src/lophoc_ad/lophoc_ad.routes");
app.use("/api/admin/classes", adminClassRoutes);

// Admin students routes
const adminStudentRoutes = require("./src/sinhvien_ad/sinhvien_ad.routes");
app.use("/api/admin/students", adminStudentRoutes);

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