-- CreateTable
CREATE TABLE `classes` (
    `class_id` VARCHAR(20) NOT NULL,
    `class_name` VARCHAR(150) NOT NULL,
    `subject_code` VARCHAR(20) NOT NULL,
    `subject_name` VARCHAR(150) NOT NULL,
    `cohort` VARCHAR(10) NOT NULL,
    `major` VARCHAR(100) NULL,
    `teacher_id` VARCHAR(20) NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'Đang hoạt động',
    `room` VARCHAR(50) NULL,
    `schedule` VARCHAR(255) NULL,
    `semester` VARCHAR(20) NULL,
    `school_year` VARCHAR(20) NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`class_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `classes`
  ADD CONSTRAINT `classes_teacher_fk`
  FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`teacher_id`)
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

-- CreateIndex
CREATE INDEX `classes_teacher_idx` ON `classes`(`teacher_id`);
CREATE INDEX `classes_cohort_idx` ON `classes`(`cohort`);
