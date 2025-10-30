# Trang Thông Báo Giảng Viên

## Tổng quan
Trang này cho phép giảng viên xem các thông báo từ admin trong hệ thống Smart Attendance.

## Tính năng

### 1. Nhận thông báo (Inbox)
- Hiển thị danh sách thông báo từ admin
- Sắp xếp theo thời gian mới nhất
- Hiển thị: tiêu đề, người gửi, ngày gửi
- Click vào thông báo để xem chi tiết

### 2. Gửi thông báo (Send)
- Giảng viên có thể gửi thông báo đến lớp học
- Chọn lớp, nhập tiêu đề và nội dung
- Hỗ trợ đính kèm file

## API Integration

### Backend Endpoint
```
GET http://localhost:8080/api/teacher/notifications/announcements
```

### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Thông báo lịch nghỉ lễ",
      "content": "Nội dung thông báo",
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

## States

### Loading State
Khi đang tải dữ liệu từ API, hiển thị: "⏳ Đang tải thông báo..."

### Error State
Khi có lỗi kết nối, hiển thị thông báo lỗi và fallback về dữ liệu mẫu

### Empty State
Khi không có thông báo nào, hiển thị: "📭 Chưa có thông báo nào"

## Cách sử dụng

1. Khởi động backend:
```bash
cd backend
node index.js
```

2. Khởi động frontend:
```bash
cd frontend
npm run dev
```

3. Truy cập trang:
```
http://localhost:3000/thongbao_gv
```

## Lưu ý
- Trang này chỉ hiển thị thông báo từ admin
- Giảng viên không thể chỉnh sửa thông báo từ admin
- Có thể gửi thông báo riêng đến lớp học
- API có fallback về dữ liệu mẫu nếu server không phản hồi

