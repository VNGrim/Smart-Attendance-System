# ThongBao HienThi API Documentation

## Tổng quan
Module này cung cấp các API để quản lý thông báo cho sinh viên trong hệ thống Smart Attendance.

## Các API Endpoints

### 1. Lấy danh sách thông báo
- **URL**: `GET /api/thongbao/announcements`
- **Mô tả**: Lấy danh sách tất cả thông báo từ database
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Nghỉ lễ 2/9",
      "content": "Sinh viên và giảng viên được nghỉ từ 1/9 đến hết 3/9.",
      "created_at": "2024-01-15T10:30:00.000Z",
      "date": "2024-01-15",
      "type": "general"
    }
  ],
  "message": "Lấy danh sách thông báo thành công"
}
```

### 2. Lấy chi tiết thông báo
- **URL**: `GET /api/thongbao/announcements/:id`
- **Mô tả**: Lấy chi tiết thông báo theo ID
- **Parameters**: 
  - `id` (number): ID của thông báo
- **Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Nghỉ lễ 2/9",
    "content": "Sinh viên và giảng viên được nghỉ từ 1/9 đến hết 3/9.",
    "created_at": "2024-01-15T10:30:00.000Z",
    "date": "2024-01-15",
    "type": "general"
  },
  "message": "Lấy chi tiết thông báo thành công"
}
```

### 3. Lấy thông tin sinh viên theo student_id
- **URL**: `GET /api/thongbao/students/:studentId`
- **Mô tả**: Lấy thông tin sinh viên theo mã sinh viên
- **Parameters**: 
  - `studentId` (string): Mã sinh viên (VD: SV001)
- **Response**:
```json
{
  "success": true,
  "data": {
    "student_id": "SV001",
    "full_name": "Nguyen Van A",
    "course": "K18",
    "classes": ["SWP", "SWR"]
  },
  "message": "Lấy thông tin sinh viên thành công"
}
```

### 4. Lấy thông tin sinh viên từ user_code
- **URL**: `GET /api/thongbao/students/by-user/:userCode`
- **Mô tả**: Lấy thông tin sinh viên từ mã đăng nhập (từ session/login)
- **Parameters**: 
  - `userCode` (string): Mã đăng nhập (VD: SV001)
- **Response**:
```json
{
  "success": true,
  "data": {
    "student_id": "SV001",
    "full_name": "Nguyen Van A",
    "course": "K18",
    "classes": ["SWP", "SWR"]
  },
  "message": "Lấy thông tin sinh viên thành công"
}
```

## Database Schema
Module này sử dụng các bảng sau:
- `announcements`: Chứa thông báo với các trường id, title, content, created_at
- `students`: Chứa thông tin sinh viên
- `accounts`: Chứa thông tin tài khoản đăng nhập

## Error Handling
Tất cả API đều có xử lý lỗi với các mã status code:
- `400`: Bad Request (dữ liệu đầu vào không hợp lệ)
- `404`: Not Found (không tìm thấy dữ liệu)
- `500`: Internal Server Error (lỗi hệ thống)

## Cách sử dụng trong Frontend
```javascript
// Lấy danh sách thông báo
const response = await fetch('/api/thongbao/announcements');
const data = await response.json();

// Lấy chi tiết thông báo
const response = await fetch('/api/thongbao/announcements/1');
const data = await response.json();

// Lấy thông tin sinh viên
const response = await fetch('/api/thongbao/students/SV001');
const data = await response.json();
```
