# 🔧 Sửa lỗi trang Cài đặt Sinh viên

## Vấn đề
Trang cài đặt sinh viên (`/caidat_sv`) không hiển thị **thông tin sinh viên** (Họ tên, MSSV, Khóa học).

## Nguyên nhân
Frontend gọi endpoint `/api/thongbao/students/:studentId` để lấy thông tin sinh viên, nhưng:

1. ❌ **Thiếu `credentials: 'include'`** trong fetch request
2. ❌ Backend yêu cầu authentication (middleware `auth`) nhưng request không gửi cookie JWT
3. ❌ Backend trả về **401 Unauthorized**, nhưng frontend không xử lý lỗi

## Giải pháp đã áp dụng

### 1. Thêm `credentials: 'include'` vào fetch request ✅

**File**: `frontend/src/app/caidat_sv/page.tsx`

```typescript
// TRƯỚC (sai):
const res = await fetch(`${base}/api/thongbao/students/${studentId}`);

// SAU (đúng):
const res = await fetch(`${base}/api/thongbao/students/${studentId}`, {
  credentials: 'include'  // ✅ Gửi cookie JWT
});
```

### 2. Endpoint backend đã có sẵn ✅

**Route**: `GET /api/thongbao/students/:studentId`

**File**: `backend/src/thongbao_hienthi/thongbao_hienthi.routes.js`

```javascript
router.get('/students/:studentId', ThongBaoController.getStudentInfo);
```

**Controller**: `backend/src/thongbao_hienthi/thongbao_hienthi.controller.js`

Trả về:
```json
{
  "success": true,
  "data": {
    "student_id": "SE190001",
    "full_name": "Nguyễn Văn A",
    "course": "K19",
    "classes": ["18DTHD1"],
    "avatar_url": "/uploads/avatars/xxx.jpg"
  }
}
```

## Cách kiểm tra

### Bước 1: Đảm bảo servers đang chạy
```bash
# Terminal 1: Backend
cd d:\Smart-Attendance-System\backend
node index.js

# Terminal 2: Frontend  
cd d:\Smart-Attendance-System\frontend
npm run dev
```

### Bước 2: Đăng nhập với tài khoản sinh viên
1. Mở http://localhost:3000/login
2. Đăng nhập:
   - **Tài khoản**: `SE190001`
   - **Mật khẩu**: `sinhvienfpt`

### Bước 3: Kiểm tra trang cài đặt
1. Click menu **Cài đặt** (⚙️) hoặc truy cập `/caidat_sv`
2. ✅ **Thông tin cá nhân** sẽ hiển thị:
   - Họ và tên
   - MSSV
   - Khóa học
   - Avatar

### Bước 4: Kiểm tra console
Mở DevTools (F12) → Console, bạn sẽ thấy:
```
📥 Fetched student data: {success: true, data: {...}}
👤 Student info: {student_id: "SE190001", full_name: "...", ...}
```

## Files đã sửa
- ✅ `frontend/src/app/caidat_sv/page.tsx` - Thêm credentials: 'include'

## Lưu ý
- Endpoint `/api/thongbao/students/:studentId` yêu cầu **authentication**
- Cần đăng nhập trước khi truy cập trang cài đặt
- Cookie JWT được tự động gửi khi có `credentials: 'include'`
