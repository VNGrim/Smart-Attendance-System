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