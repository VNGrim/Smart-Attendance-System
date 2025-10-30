-- DropForeignKey
ALTER TABLE `classes` DROP FOREIGN KEY `classes_teacher_fk`;

-- AddForeignKey
ALTER TABLE `classes` ADD CONSTRAINT `classes_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`teacher_id`) ON DELETE SET NULL ON UPDATE NO ACTION;
