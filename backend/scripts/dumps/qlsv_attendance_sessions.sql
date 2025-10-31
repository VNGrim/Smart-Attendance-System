-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: qlsv
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `attendance_sessions`
--

DROP TABLE IF EXISTS `attendance_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `class_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slot_id` int NOT NULL,
  `day` date NOT NULL,
  `code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` timestamp NOT NULL,
  `type` enum('qr','code','manual') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','expired','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `attempts` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `attendance_sessions_class_day_slot_idx` (`class_id`,`day`,`slot_id`),
  KEY `attendance_sessions_slot_fk` (`slot_id`),
  CONSTRAINT `attendance_sessions_class_fk` FOREIGN KEY (`class_id`) REFERENCES `classes` (`class_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `attendance_sessions_slot_fk` FOREIGN KEY (`slot_id`) REFERENCES `time_slots` (`slot_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_sessions`
--

LOCK TABLES `attendance_sessions` WRITE;
/*!40000 ALTER TABLE `attendance_sessions` DISABLE KEYS */;
INSERT INTO `attendance_sessions` VALUES (1,'SE19B3',1,'2025-10-29','62KRDV','2025-10-29 23:28:33','code','active',0,'2025-10-29 23:27:33','2025-10-29 23:27:33'),(2,'SE19B3',1,'2025-10-29','ZKYNSZ','2025-10-29 23:28:34','code','active',0,'2025-10-29 23:27:34','2025-10-29 23:27:34'),(3,'SE19B3',1,'2025-10-29','5YP2F3','2025-10-29 23:33:23','qr','active',0,'2025-10-29 23:32:23','2025-10-29 23:32:23'),(4,'SE19B3',1,'2025-10-29','7KYJ32','2025-10-29 23:35:29','code','active',3,'2025-10-29 23:33:07','2025-10-29 23:34:29'),(5,'SE19B3',1,'2025-10-29','GDLHLR','2025-10-29 23:36:04','qr','active',3,'2025-10-29 23:34:57','2025-10-29 23:35:04'),(6,'SE19B3',1,'2025-10-29','UTMGP8','2025-10-29 23:35:16','manual','active',0,'2025-10-29 23:35:16','2025-10-29 23:35:16'),(7,'SE19B3',1,'2025-10-29','RMZ5NZ','2025-10-29 23:35:24','manual','active',0,'2025-10-29 23:35:24','2025-10-29 23:35:24'),(8,'SE19B3',3,'2025-10-29','XX7WRT','2025-10-30 00:03:46','code','active',3,'2025-10-30 00:02:15','2025-10-30 00:02:46'),(9,'SE19B3',3,'2025-10-29','KCGGMM','2025-10-30 00:14:47','code','active',0,'2025-10-30 00:13:47','2025-10-30 00:13:47'),(10,'SE19B3',3,'2025-10-29','K9PLXK','2025-10-30 00:25:10','code','active',3,'2025-10-30 00:23:47','2025-10-30 00:24:10'),(11,'SE19B3',3,'2025-10-29','RGW5C3','2025-10-30 00:39:52','code','active',0,'2025-10-30 00:38:52','2025-10-30 00:38:52'),(12,'SE19B3',3,'2025-10-29','3KPLEC','2025-10-30 01:12:52','code','active',2,'2025-10-30 01:10:49','2025-10-30 01:11:52'),(13,'SE19B3',3,'2025-10-29','RWGAFB','2025-10-30 01:13:06','qr','active',0,'2025-10-30 01:12:06','2025-10-30 01:12:06'),(14,'SE19B3',1,'2025-10-29','XXA26Q','2025-10-30 01:15:34','qr','active',0,'2025-10-30 01:14:34','2025-10-30 01:14:34'),(15,'SE19B3',1,'2025-10-29','2ZN3KQ','2025-10-30 01:32:40','qr','active',0,'2025-10-30 01:31:40','2025-10-30 01:31:40'),(16,'SE19B3',3,'2025-10-29','S3SDAJ','2025-10-30 01:38:03','qr','active',0,'2025-10-30 01:37:03','2025-10-30 01:37:03'),(17,'SE19B3',3,'2025-10-29','Y94NRC','2025-10-30 01:39:24','code','active',0,'2025-10-30 01:38:24','2025-10-30 01:38:24'),(18,'SE19B3',3,'2025-10-29','BL58FT','2025-10-30 01:39:32','qr','active',0,'2025-10-30 01:38:32','2025-10-30 01:38:32');
/*!40000 ALTER TABLE `attendance_sessions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-31 16:37:45
