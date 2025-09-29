CREATE DATABASE IF NOT EXISTS qlsv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE qlsv;

-- =========================
-- 1. Bảng tài khoản (sinh viên, giảng viên, admin)
-- =========================
DROP TABLE IF EXISTS accounts;
CREATE TABLE accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_code VARCHAR(20) UNIQUE NOT NULL,   -- Mã sinh viên / giảng viên / admin
    password VARCHAR(255) NOT NULL,          -- mật khẩu (chưa hash, demo thôi)
    role ENUM('student', 'teacher', 'admin') NOT NULL
);

-- =========================
-- 2. Bảng sinh viên
-- =========================
DROP TABLE IF EXISTS students;
CREATE TABLE students (
    student_id VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    course VARCHAR(10) NOT NULL,              -- Khóa học: K18, K19...
    classes VARCHAR(255),            -- Các lớp đang học (ngăn cách dấu phẩy)
    account_id INT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- =========================
-- 3. Bảng giảng viên
-- =========================
DROP TABLE IF EXISTS teachers;
CREATE TABLE teachers (
    teacher_id VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,            -- Dạy môn gì
    classes VARCHAR(255),            -- Các lớp đang dạy
    account_id INT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- =========================
-- 4. Bảng thông báo
-- =========================
DROP TABLE IF EXISTS announcements;
CREATE TABLE announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 5. Bảng slot
-- =========================
DROP TABLE IF EXISTS time_slots;
CREATE TABLE time_slots (
    slot_id INT PRIMARY KEY,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL
);

-- =========================
-- 6. Bảng lịch học
-- =========================
DROP TABLE IF EXISTS timetable;
CREATE TABLE timetable (
    id INT AUTO_INCREMENT PRIMARY KEY,
    classes VARCHAR(100) NOT NULL,               -- Tên môn học
    day_of_week ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun') NOT NULL,
    slot_id INT NOT NULL,
    room VARCHAR(50) NOT NULL,
    FOREIGN KEY (slot_id) REFERENCES time_slots(slot_id) ON DELETE CASCADE ON UPDATE CASCADE
);
-- =========================
-- INSERT DỮ LIỆU MẪU
-- =========================

-- Tài khoản
INSERT INTO accounts (user_code, password, role) VALUES
('SV001', '123456', 'student'),
('SV002', '123456', 'student'),
('GV001', '123456', 'teacher'),
('GV002', '123456', 'teacher'),
('admin', 'admin123', 'admin');

-- Sinh viên
INSERT INTO students (student_id, full_name, course, classes, account_id) VALUES
('SV001', 'Nguyen Van A', 'K18', 'SWP, SWR', 1),
('SV002', 'Tran Thi B', 'K19', 'SWP', 2);

-- Giảng viên
INSERT INTO teachers (teacher_id, full_name, subject, classes, account_id) VALUES
('GV001', 'Le Van C', 'Cơ sở dữ liệu', 'SWP', 3),
('GV002', 'Pham Thi D', 'Lập trình Web', 'SWR, SWP', 4);

-- Thông báo
INSERT INTO announcements (title, content) VALUES
('Nghỉ lễ 2/9', 'Sinh viên và giảng viên được nghỉ từ 1/9 đến hết 3/9.'),
('Đăng ký học phần', 'Mở cổng đăng ký học phần từ ngày 10/9 đến 20/9.'),
('Bảo trì hệ thống', 'Hệ thống sẽ bảo trì vào ngày 30/9 từ 22h00 đến 23h30.');

-- Lịch học
INSERT INTO time_slots (slot_id, start_time, end_time) VALUES
(1, '07:00:00', '09:15:00'),
(2, '09:30:00', '11:45:00'),
(3, '12:30:00', '15:15:00'),
(4, '15:30:00', '17:15:00');

INSERT INTO timetable (classes, day_of_week, slot_id, room)
VALUES 
('SWP', 'Mon', '1', 'P101'),
('SWP', 'Wed', '3', 'P101'),
('SWP', 'Sat', '2', 'P101'),
('SWR', 'Tue', '4', 'P102'),
('SWR', 'Wed', '2', 'P102'),
('SWR', 'Fri', '1', 'P102');
