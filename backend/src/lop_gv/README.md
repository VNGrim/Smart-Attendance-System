# Module Lớp Giảng Viên (lop_gv)

Module này cung cấp các API để quản lý lớp học của giảng viên trong hệ thống điểm danh thông minh.

## Cấu trúc API

### Base URL
```
/api/lop
```

### Endpoints

#### 1. Lấy danh sách lớp học của giảng viên
```
GET /api/lop/teacher/:teacherId/classes
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "class_id": "1",
      "class_name": "SE18A",
      "subject_name": "Lập trình Web",
      "semester": "1",
      "school_year": "2024-2025",
      "student_count": 17
    }
  ],
  "message": "Lấy danh sách lớp học thành công"
}
```

#### 2. Lấy chi tiết lớp học
```
GET /api/lop/classes/:classId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "class_id": "1",
    "class_name": "SE18A",
    "subject_name": "Lập trình Web",
    "semester": "1",
    "school_year": "2024-2025",
    "room": "A101",
    "schedule": "Thứ 2, 7:30-9:30",
    "description": "Lớp học lập trình web cơ bản",
    "teacher_name": "Nguyễn Văn A",
    "teacher_id": "MAS291"
  },
  "message": "Lấy chi tiết lớp học thành công"
}
```

#### 3. Lấy danh sách sinh viên trong lớp
```
GET /api/lop/classes/:classId/students
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "student_id": "SV001",
      "full_name": "Nguyễn Văn B",
      "email": "sv001@example.com",
      "phone": "0123456789",
      "course": "2024",
      "enrolled_at": "2024-09-01",
      "status": "active"
    }
  ],
  "message": "Lấy danh sách sinh viên thành công"
}
```

#### 4. Lấy thông tin giảng viên
```
GET /api/lop/teacher/:teacherId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "teacher_id": "MAS291",
    "full_name": "Nguyễn Văn A",
    "email": "gv291@example.com",
    "phone": "0987654321",
    "department": "Công nghệ thông tin"
  },
  "message": "Lấy thông tin giảng viên thành công"
}
```

#### 5. Lấy thông báo của lớp học
```
GET /api/lop/classes/:classId/announcements
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Thông báo lịch thi",
      "content": "Lịch thi cuối kỳ sẽ được thông báo sau",
      "created_at": "2024-10-23T10:00:00.000Z",
      "updated_at": "2024-10-23T10:00:00.000Z",
      "date": "2024-10-23"
    }
  ],
  "message": "Lấy thông báo lớp học thành công"
}
```

#### 6. Tạo thông báo mới cho lớp
```
POST /api/lop/classes/:classId/announcements
```

**Request Body:**
```json
{
  "title": "Tiêu đề thông báo",
  "content": "Nội dung thông báo",
  "teacherId": "MAS291"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2
  },
  "message": "Tạo thông báo thành công"
}
```

## Cấu trúc Database

### Bảng classes
- class_id (Primary Key)
- class_name
- subject_name
- semester
- school_year
- room
- schedule
- description
- teacher_id (Foreign Key)

### Bảng student_classes
- student_id (Foreign Key)
- class_id (Foreign Key)
- enrolled_at
- status

### Bảng class_announcements
- id (Primary Key)
- class_id (Foreign Key)
- title
- content
- teacher_id (Foreign Key)
- created_at
- updated_at

## Sử dụng trong Frontend

```typescript
// Lấy danh sách lớp học
const response = await fetch(`/api/lop/teacher/${teacherId}/classes`);
const data = await response.json();

// Lấy danh sách sinh viên
const response = await fetch(`/api/lop/classes/${classId}/students`);
const data = await response.json();

// Lấy thông báo lớp
const response = await fetch(`/api/lop/classes/${classId}/announcements`);
const data = await response.json();
```
