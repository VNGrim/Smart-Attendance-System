# 🔐 Thông tin đăng nhập hệ thống

## Tài khoản có sẵn trong database

Dựa trên dữ liệu hiện tại trong database:

### 1. Admin
- **Tài khoản**: `admin`
- **Mật khẩu**: `admin123`
- **Vai trò**: Quản trị viên
- **Trang chủ sau khi đăng nhập**: `/tongquan_ad`

### 2. Sinh viên
- **Tài khoản**: `SE190001`
- **Mật khẩu**: `sinhvienfpt` (mật khẩu mặc định cho sinh viên)
- **Vai trò**: Sinh viên
- **Trang chủ sau khi đăng nhập**: `/tongquan_sv`

- **Tài khoản**: `SE190002`
- **Mật khẩu**: `sinhvienfpt`
- **Vai trò**: Sinh viên
- **Trang chủ sau khi đăng nhập**: `/tongquan_sv`

### 3. Giảng viên
- **Tài khoản**: `GV001`
- **Mật khẩu**: `giangvienfpt` (có thể thử) hoặc kiểm tra trong seed script
- **Vai trò**: Giảng viên
- **Trang chủ sau khi đăng nhập**: `/tongquan_gv`

## Cách truy cập trang quản lý sinh viên

1. Đăng nhập với tài khoản **admin** (admin/admin123)
2. Sau khi đăng nhập thành công, bạn sẽ được chuyển đến `/tongquan_ad`
3. Click vào menu **Sinh viên** (👨‍🎓) bên trái
4. Hoặc truy cập trực tiếp: http://localhost:3000/sinhvien_ad

## Lỗi "Thông tin sinh viên không hiện"

### Nguyên nhân
- **401 Unauthorized**: Chưa đăng nhập hoặc phiên đã hết hạn
- **403 Forbidden**: Đang đăng nhập với tài khoản không phải admin
- Backend yêu cầu cookie JWT để xác thực

### Giải pháp đã áp dụng
1. ✅ Thêm xử lý lỗi 401 → tự động chuyển về trang login
2. ✅ Thêm xử lý lỗi 403 → hiển thị thông báo "Bạn không có quyền truy cập"
3. ✅ Hiển thị message lỗi rõ ràng trên UI

### Cách test
```bash
# 1. Đảm bảo backend đang chạy
cd d:\Smart-Attendance-System\backend
node index.js

# 2. Đảm bảo frontend đang chạy
cd d:\Smart-Attendance-System\frontend
npm run dev

# 3. Mở trình duyệt
# - Truy cập: http://localhost:3000/login
# - Đăng nhập: admin / admin123
# - Chuyển đến trang Sinh viên
```

## Tạo tài khoản admin mới (nếu cần)

```bash
cd d:\Smart-Attendance-System\backend
node scripts/seedAdmin.js
```

Script này sẽ tạo/cập nhật tài khoản:
- Username: `admin`
- Password: `admin123`
- Role: `admin`
