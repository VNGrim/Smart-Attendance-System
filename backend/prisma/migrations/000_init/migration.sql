-- CreateTable
CREATE TABLE `accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_code` VARCHAR(20) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('student', 'teacher', 'admin') NOT NULL,

    UNIQUE INDEX `user_code`(`user_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `announcements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `category` VARCHAR(50) NOT NULL DEFAULT 'general',
    `code` VARCHAR(64) NULL,
    `history` JSON NULL,
    `recipients` JSON NULL,
    `scheduled_at` TIMESTAMP(0) NULL,
    `send_time` TIMESTAMP(0) NULL,
    `sender` VARCHAR(100) NOT NULL DEFAULT 'Admin',
    `status` VARCHAR(30) NOT NULL DEFAULT 'Đã gửi',
    `target` VARCHAR(255) NOT NULL DEFAULT 'Toàn trường',
    `type` VARCHAR(50) NOT NULL DEFAULT 'Khác',
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `announcements_code_key`(`code`),
    INDEX `announcements_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `students` (
    `student_id` VARCHAR(20) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `course` VARCHAR(10) NOT NULL,
    `classes` VARCHAR(255) NULL,
    `account_id` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `account_id`(`account_id`),
    PRIMARY KEY (`student_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teachers` (
    `teacher_id` VARCHAR(20) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `subject` VARCHAR(100) NOT NULL,
    `classes` VARCHAR(255) NULL,
    `account_id` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `account_id`(`account_id`),
    PRIMARY KEY (`teacher_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `time_slots` (
    `slot_id` INTEGER NOT NULL,
    `start_time` TIME(0) NOT NULL,
    `end_time` TIME(0) NOT NULL,

    PRIMARY KEY (`slot_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timetable` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `classes` VARCHAR(100) NOT NULL,
    `day_of_week` ENUM('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun') NOT NULL,
    `slot_id` INTEGER NOT NULL,
    `room` VARCHAR(50) NOT NULL,

    INDEX `slot_id`(`slot_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `semester_attendance_stats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `total_students` INTEGER NOT NULL,
    `attendance_ratio` DOUBLE NOT NULL,
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `semester_attendance_stats_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `timetable` ADD CONSTRAINT `timetable_ibfk_1` FOREIGN KEY (`slot_id`) REFERENCES `time_slots`(`slot_id`) ON DELETE CASCADE ON UPDATE CASCADE;
