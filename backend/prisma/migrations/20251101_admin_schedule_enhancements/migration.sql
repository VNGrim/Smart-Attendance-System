-- Migration: add week key and availability tables for admin schedule enhancements

ALTER TABLE `timetable`
  ADD COLUMN `week_key` VARCHAR(20) NOT NULL DEFAULT 'UNASSIGNED',
  ADD COLUMN `teacher_id` VARCHAR(20) NULL,
  ADD COLUMN `teacher_name` VARCHAR(150) NULL,
  ADD COLUMN `subject_name` VARCHAR(150) NULL,
  ADD COLUMN `room_name` VARCHAR(150) NULL,
  ADD INDEX `timetable_week_slot_idx` (`week_key`, `day_of_week`, `slot_id`),
  ADD INDEX `timetable_week_teacher_idx` (`week_key`, `teacher_id`);

CREATE TABLE `rooms` (
  `room_id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NULL,
  `capacity` INT NULL,
  `location` VARCHAR(150) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`room_id`),
  UNIQUE KEY `rooms_code_key` (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `teacher_availability` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `teacher_id` VARCHAR(20) NOT NULL,
  `day_of_week` ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun') NOT NULL,
  `slot_id` INT NOT NULL,
  `is_available` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id`),
  KEY `teacher_availability_idx` (`teacher_id`, `day_of_week`, `slot_id`),
  CONSTRAINT `teacher_availability_teacher_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`teacher_id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `teacher_availability_slot_fk` FOREIGN KEY (`slot_id`) REFERENCES `time_slots`(`slot_id`) ON DELETE CASCADE ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `room_availability` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `room_code` VARCHAR(50) NOT NULL,
  `day_of_week` ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun') NOT NULL,
  `slot_id` INT NOT NULL,
  `is_available` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id`),
  KEY `room_availability_idx` (`room_code`, `day_of_week`, `slot_id`),
  CONSTRAINT `room_availability_room_fk` FOREIGN KEY (`room_code`) REFERENCES `rooms`(`code`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `room_availability_slot_fk` FOREIGN KEY (`slot_id`) REFERENCES `time_slots`(`slot_id`) ON DELETE CASCADE ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
