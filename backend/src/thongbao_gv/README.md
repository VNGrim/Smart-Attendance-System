# ThongBao GV (Teacher Notifications) API Documentation

## Tổng quan
Module này cung cấp các API để giảng viên xem thông báo từ admin trong hệ thống Smart Attendance.

## Các API Endpoints

### 1. Lấy danh sách thông báo
- **URL**: `GET /api/teacher/notifications/announcements`
- **Mô tả**: Lấy danh sách thông báo từ admin có category = 'giangvien', được sắp xếp theo thời gian mới nhất
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Thông báo lịch nghỉ lễ",
      "content": "Hệ thống sẽ tạm dừng hoạt động từ ngày 30/4 đến hết ngày 1/5",
      "sender": "Admin",
      "date": "2024-04-25T10:30:00.000Z",
      "dateFormatted": "25 tháng 4 năm 2024",
      "time": "10:30",
      "type": "Lịch nghỉ",
      "status": "Đã gửi",
      "category": "important"
    }
  ],
  "message": "Lấy danh sách thông báo thành công"
}
```

### 2. Lấy chi tiết thông báo
- **URL**: `GET /api/teacher/notifications/announcements/:id`
- **Mô tả**: Lấy chi tiết thông báo theo ID
- **Parameters**: 
  - `id` (number): ID của thông báo
- **Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Thông báo lịch nghỉ lễ",
    "content": "Hệ thống sẽ tạm dừng hoạt động từ ngày 30/4 đến hết ngày 1/5. Quý thầy cô vui lòng sắp xếp lịch dạy phù hợp.",
    "sender": "Admin",
    "date": "2024-04-25T10:30:00.000Z",
    "dateFormatted": "25 tháng 4 năm 2024",
    "time": "10:30",
    "type": "Lịch nghỉ",
    "status": "Đã gửi",
    "category": "important"
  },
  "message": "Lấy chi tiết thông báo thành công"
}
```

## Cách sử dụng

### Frontend Integration
```javascript
// Lấy danh sách thông báo
const response = await fetch('http://localhost:8080/api/teacher/notifications/announcements');
const data = await response.json();

// Lấy chi tiết thông báo
const detailResponse = await fetch('http://localhost:8080/api/teacher/notifications/announcements/1');
const detailData = await detailResponse.json();
```

## Lưu ý
- Giảng viên chỉ có quyền **xem** thông báo, không có quyền chỉnh sửa
- Chỉ hiển thị thông báo có **category = 'giangvien'**
- Thông báo được sắp xếp theo thời gian tạo mới nhất
- Tất cả thông báo đều do admin tạo và quản lý

