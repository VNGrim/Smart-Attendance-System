SMART ATTENDANCE SYSTEM - SETUP GUIDE
====================================

This document liệt kê các bước tối thiểu để chạy dự án trên máy mới và đồng bộ cơ sở dữ liệu MySQL.

1. YÊU CẦU HỆ THỐNG
-------------------
- Node.js >= 20.x (npm đi kèm)
- MySQL >= 8.x
- Git
- (Tùy chọn) Docker >= 24.x
- Trình quản lý phiên bản Node như nvm/fnm giúp đổi phiên bản nhanh hơn

2. CLONE DỰ ÁN
--------------
```
git clone https://github.com/VNGrim/Smart-Attendance-System.git
cd Smart-Attendance-System
```

3. THIẾT LẬP BACKEND (THƯ MỤC /backend)
---------------------------------------
3.1 Tạo file môi trường
```
cd backend
cp .env.example .env   # Windows: copy .env.example .env
```
Chỉnh biến `DATABASE_URL` theo mẫu:
```
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DBNAME"
```
Đảm bảo database và tài khoản MySQL tồn tại.

3.2 Cài dependency Node
```
npm install
```

3.3 Đồng bộ schema Prisma
- Áp dụng migrations đã commit:
```
npx prisma migrate deploy
```
- Hoặc tạo bảng theo schema hiện tại (dành cho môi trường trống):
```
npx prisma db push
```

3.4 Seed dữ liệu mẫu (tuỳ chọn)
```
node scripts/seedSemesterAttendance.js
```

3.5 Chạy backend
```
node index.js
```
Backend mặc định dùng `http://localhost:8080`.

4. THIẾT LẬP FRONTEND (THƯ MỤC /frontend)
-----------------------------------------
4.1 Cài dependency
```
cd ../frontend
npm install
```

4.2 Chạy ứng dụng Next.js
```
npm run dev
```
Frontend mặc định ở `http://localhost:3000`.

5. ĐỒNG BỘ CƠ SỞ DỮ LIỆU CHO MÁY MỚI
------------------------------------
Dùng Prisma migrations 
  a. Đảm bảo `backend/.env` trỏ tới DB trống.
  b. Chạy `npx prisma migrate deploy`.
  c. Nếu cần dữ liệu mẫu, chạy `node scripts/seedSemesterAttendance.js`.


7. TROUBLESHOOTING NHANH
------------------------
- Prisma Error P1001: MySQL không truy cập được → kiểm tra dịch vụ, user, firewall, port.
- `EADDRINUSE: 8080`: cổng 8080 đã được dùng → đổi port hoặc tắt tiến trình đang lắng nghe.
- Frontend gọi API lỗi: kiểm tra backend đang chạy và cho phép CORS (`index.js` đã bật credentials=true).

8. GHI CHÚ
----------
- Repo chưa có Docker Compose. Nếu muốn setup nhanh hơn, hãy bổ sung file Compose để dựng MySQL + backend + frontend tự động.
- Khi chia sẻ file dump SQL cần lưu ý dữ liệu nhạy cảm.

Chúc bạn cài đặt thuận lợi! 🚀
