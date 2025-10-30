-- CreateTable
CREATE TABLE `attendance_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `class_id` VARCHAR(20) NOT NULL,
    `slot_id` INTEGER NOT NULL,
    `day` DATE NOT NULL,
    `code` VARCHAR(16) NOT NULL,
    `expires_at` TIMESTAMP(0) NOT NULL,
    `type` ENUM('qr', 'code', 'manual') NOT NULL,
    `status` ENUM('active', 'expired', 'closed') NOT NULL DEFAULT 'active',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `attendance_sessions_class_day_slot_idx`(`class_id`, `day`, `slot_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `student_id` VARCHAR(20) NOT NULL,
    `status` ENUM('present', 'absent', 'excused') NOT NULL DEFAULT 'present',
    `marked_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `note` VARCHAR(255) NULL,

    INDEX `attendance_records_student_idx`(`student_id`),
    UNIQUE INDEX `attendance_records_session_student_unique`(`session_id`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `time_slots_slot_idx` ON `time_slots`(`slot_id`);

-- AddForeignKey
ALTER TABLE `attendance_sessions` ADD CONSTRAINT `attendance_sessions_class_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`class_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_sessions` ADD CONSTRAINT `attendance_sessions_slot_fk` FOREIGN KEY (`slot_id`) REFERENCES `time_slots`(`slot_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_session_fk` FOREIGN KEY (`session_id`) REFERENCES `attendance_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_student_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `room_availability` RENAME INDEX `room_availability_slot_fk` TO `room_availability_slot_idx`;

-- RenameIndex
ALTER TABLE `teacher_availability` RENAME INDEX `teacher_availability_slot_fk` TO `teacher_availability_slot_idx`;
