# Trang Thông Báo Sinh Viên (thongbao_sv)

## Tổng quan
Trang thông báo sinh viên hiển thị danh sách thông báo từ hệ thống với giao diện đẹp, chữ to rõ và căn chỉnh hợp lý.

## Tính năng chính

### 1. **Hiển thị danh sách thông báo**
- Lấy dữ liệu từ API backend `/api/thongbao/announcements`
- Hiển thị tiêu đề và nội dung preview của thông báo
- Hiển thị thời gian đăng thông báo
- Sắp xếp theo thời gian mới nhất

### 2. **Giao diện cải tiến**
- **Chữ to rõ**: Tiêu đề thông báo font-size 18px, font-weight 700
- **Căn chỉnh hợp lý**: Layout flexbox với gap 20px, padding 20px
- **Hover effects**: Hiệu ứng hover với background và animation
- **Responsive**: Tối ưu cho các kích thước màn hình khác nhau

### 3. **Tính năng tương tác**
- **Click để xem chi tiết**: Click vào thông báo để mở modal chi tiết
- **Modal popup**: Hiển thị đầy đủ nội dung thông báo
- **Loading state**: Hiển thị spinner khi đang tải dữ liệu
- **Error handling**: Xử lý lỗi với nút "Thử lại"

### 4. **Trạng thái hiển thị**
- **Loading**: Spinner animation với text "Đang tải thông báo..."
- **Error**: Icon cảnh báo với nút retry
- **Empty**: Icon thông báo với text "Chưa có thông báo nào"
- **Success**: Danh sách thông báo đầy đủ

## Cấu trúc dữ liệu

### Announcement Interface
```typescript
interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
  date: string;
  type: string;
}
```

### StudentInfo Interface
```typescript
interface StudentInfo {
  student_id: string;
  full_name: string;
  course: string;
  classes: string[];
}
```

## API Endpoints sử dụng

1. **GET** `/api/thongbao/announcements` - Lấy danh sách thông báo
2. **GET** `/api/thongbao/announcements/:id` - Lấy chi tiết thông báo
3. **GET** `/api/thongbao/students/SV001` - Lấy thông tin sinh viên

## Cách sử dụng

### 1. Khởi động Backend
```bash
cd backend
node index.js
```

### 2. Khởi động Frontend
```bash
cd frontend
npm run dev
```

### 3. Truy cập trang
- URL: `http://localhost:3000/thongbao_sv`
- Trang sẽ tự động fetch dữ liệu từ backend

## Styling và Layout

### CSS Variables
```css
:root {
  --bg-page: #F1F4CB;
  --header-bg: #49998A;
  --tab-active-bg: #FFD700;
}
```

### Layout Structure
- **Header**: User info + QR Button
- **Navigation**: Tabs (Thông báo, Lịch học, Lịch sử)
- **Content**: Card container với danh sách thông báo
- **Modal**: Popup chi tiết thông báo

### Typography
- **Tiêu đề thông báo**: 18px, font-weight 700, color #1A1A1A
- **Nội dung preview**: 16px, color #4A4A4A, line-height 1.5
- **Thời gian**: 15px, font-weight 600, color #666

## Responsive Design
- Container width: 1137px với margin auto
- Card padding: 28px 24px
- Notification item padding: 20px 0
- Modal max-width: 600px với padding 20px

## Browser Support
- Chrome, Firefox, Safari, Edge
- CSS Grid và Flexbox support
- Modern JavaScript (ES6+)

## Performance
- Lazy loading cho modal content
- Efficient re-renders với React hooks
- CSS transitions cho smooth animations
- Optimized API calls với error handling
