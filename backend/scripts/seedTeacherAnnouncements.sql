-- Script để seed dữ liệu thông báo cho giảng viên
-- Chạy script này để tạo các thông báo mẫu có category = 'giangvien'

-- Xóa dữ liệu cũ (tùy chọn)
-- DELETE FROM announcements WHERE category = 'giangvien';

-- Insert thông báo cho giảng viên
INSERT INTO announcements (title, content, sender, target, category, type, status, created_at) VALUES
('Thông báo họp giáo viên tháng 11', 'Kính mời quý thầy cô tham dự họp định kỳ tháng 11 vào thứ 4 lúc 14:00 tại phòng A1. Nội dung: Tổng kết chất lượng giảng dạy và trao đổi phương pháp cải thiện.', 'Phòng đào tạo', 'Tất cả giảng viên', 'giangvien', 'Họp', 'Đã gửi', NOW()),
('Lịch bảo trì hệ thống LMS', 'Hệ thống LMS sẽ bảo trì từ 22:00 đến 23:30 ngày 30/11/2025. Mong quý thầy cô thông cảm và sắp xếp lịch upload tài liệu lên sớm hơn.', 'Admin hệ thống', 'Tất cả giảng viên', 'giangvien', 'Bảo trì', 'Đã gửi', NOW() - INTERVAL 1 DAY),
('Thông báo về quy chế điểm danh mới', 'Kể từ học kỳ mới, hệ thống điểm danh bằng QR code sẽ được áp dụng. Quý thầy cô vui lòng tạo QR code cho từng buổi học theo hướng dẫn.', 'Phòng đào tạo', 'Tất cả giảng viên', 'giangvien', 'Quy định', 'Đã gửi', NOW() - INTERVAL 2 DAY),
('Hướng dẫn sử dụng hệ thống Smart Attendance', 'Chúng tôi đã cập nhật tính năng mới trong hệ thống Smart Attendance. Quý thầy cô có thể xem hướng dẫn chi tiết tại menu Help.', 'Admin hệ thống', 'Tất cả giảng viên', 'giangvien', 'Hướng dẫn', 'Đã gửi', NOW() - INTERVAL 3 DAY);

-- Kiểm tra dữ liệu đã insert
SELECT * FROM announcements WHERE category = 'giangvien' ORDER BY created_at DESC;

