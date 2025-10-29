-- CreateTable
CREATE TABLE `cohorts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(10) NOT NULL,
    `year` INTEGER NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `cohorts_code_key`(`code`),
    INDEX `cohorts_year_idx`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed initial cohorts
INSERT INTO `cohorts` (`code`, `year`) VALUES
  ("K18", 2018),
  ("K19", 2019)
ON DUPLICATE KEY UPDATE `year` = VALUES(`year`);
