SMART ATTENDANCE SYSTEM - SETUP GUIDE
====================================

This document liệt kê các bước tối thiểu để chạy dự án trên máy mới, đồng bộ cơ sở dữ liệu MySQL và cách chạy localhost.

1. YÊU CẦU HỆ THỐNG
-------------------
- Node.js >= 20.x (npm đi kèm)
- MySQL >= 8.x
- Git
- (Tùy chọn) Docker >= 24.x
- Trình quản lý phiên bản Node như nvm/fnm giúp đổi phiên bản nhanh hơn

2. CLONE DỰ ÁN (Thực hiện 1 lần)
--------------
```
git clone https://github.com/VNGrim/Smart-Attendance-System.git
cd Smart-Attendance-System
```

3. THIẾT LẬP FRONTEND & BACKEND & PRISMA (Thực hiện 1 lần)
---------------------------------------
- Kiểm tra trong thư mục /backend có file .env không, nếu không có thì sao chép file .env.example thành .env
- .env: DATABASE_URL="mysql://root:xxxxxx@localhost:3306/qlsv" Trong đó xxxxxx là mật khẩu mysql trên máy của mình
- Chạy setup.bat

4. Đồng bộ DATABASE (Cập nhật thường xuyên)
-----------------------------------------
- Mở MySQL Workbench
- Chọn Data Import/Restore
- Chọn file dump.sql trong thư mục /backend/scripts/dump
- Nhấn Start Import

5. Cách chạy và dừng localhost 
------------------------------------
- Mở cmd
- cd tới thư mục code
- Chạy lệnh: npx concurrently "node backend/index.js" "npm --prefix frontend run dev"
- Ctrl + C để dừng localhost, nếu có hỏi Y/N thì chọn Y

6. GHI CHÚ
----------
- Chỉ chia sẻ file dump SQL khi có cái gì mới.

Chúc bạn cài đặt thuận lợi! 🚀
