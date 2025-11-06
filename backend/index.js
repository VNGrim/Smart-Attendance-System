const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const prisma = require("./src/config/prisma"); // Import cấu hình Prisma

const { scheduleAttendanceCleanup } = require("./src/diemdanh_gv/attendance.cron");

const app = express();
const PORT = process.env.PORT || 8080;
app.set("trust proxy", 1);

// 🧩 Cấu hình middleware chung
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL || "https://sas-drab-nine.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // Cho phép requests không có origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  },
  credentials: true, // Cho phép gửi cookie JWT
}));
app.use(bodyParser.json());
app.use(cookieParser());

// 🖼️ Cho phép truy cập ảnh avatar
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🧱 Import tất cả các route module
const lichhocRoutes = require("./src/lichhoc_hienthi/lichhoc_hienthi.routes");
const thongbaoRoutes = require("./src/thongbao_hienthi/thongbao_hienthi.routes");
const thongbaoGVRoutes = require("./src/thongbao_gv/thongbao_gv.routes");
const lopRoutes = require("./src/lop_gv/lop_gv.routes");
const attendanceRoutes = require("./src/diemdanh_gv");
const studentAttendanceRoutes = require("./src/diemdanh_sv");
const authRoutes = require("./src/routes/auth.routes");
const userRoutes = require("./src/routes/user.routes");
const adminOverviewRoutes = require("./src/tongquan_ad/tongquan_ad.routes");
const adminAnnouncementRoutes = require("./src/thongbao_ad/thongbao_ad.routes");
const adminLecturerRoutes = require("./src/giangvien_ad/giangvien_ad.routes");
const adminClassRoutes = require("./src/lophoc_ad/lophoc_ad.routes");
const adminStudentRoutes = require("./src/sinhvien_ad/sinhvien_ad.routes");
const adminAccountsRoutes = require("./src/taikhoan_ad.routes");
const tongquanGVRoutes = require("./src/tongquan_gv/tongquan_gv.routes");
const studentOverviewRoutes = require("./src/tongquan_sv/tongquan_sv.routes");

// 🧩 Route upload avatar
const studentRoutes = require("./src/routes/student.routes");
app.use("/api/students", studentRoutes);

const teacherRoutes = require("./src/teachers/teachers.routes");
app.use("/api/teachers", teacherRoutes);


// 🧱 Mount các route hiện có
app.use("/api/lichhoc", lichhocRoutes);
app.use("/api/thongbao", thongbaoRoutes);
app.use("/api/teacher/notifications", thongbaoGVRoutes);
app.use("/api/lop", lopRoutes);
app.use("/api/attendances", attendanceRoutes);
app.use("/api/student-attendance", studentAttendanceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api/admin/overview", adminOverviewRoutes);
app.use("/api/admin/notifications", adminAnnouncementRoutes);
app.use("/api/admin/lecturers", adminLecturerRoutes);
app.use("/api/admin/classes", adminClassRoutes);
app.use("/api/admin/students", adminStudentRoutes);
app.use("/api/admin/accounts", adminAccountsRoutes);
app.use("/api/teacher/dashboard", tongquanGVRoutes);
app.use("/api/student/overview", studentOverviewRoutes);

// 🌱 Route test
app.get("/api/classes", (req, res) => {
  res.json([
    { id: "C01", name: "Lập trình Web" },
    { id: "C02", name: "Cơ sở dữ liệu" },
  ]);
});

// ⏰ Đăng ký cron cleanup session điểm danh cũ
scheduleAttendanceCleanup();

// 🚀 Chạy server
app.listen(PORT, () => {
  console.log(`✅ Backend đang chạy tại: http://localhost:${PORT}`);
});
