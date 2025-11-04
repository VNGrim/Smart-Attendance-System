-- SQLINES DEMO ***  Distrib 8.0.43, for Win64 (x86_64)
--
-- SQLINES DEMO ***   Database: qlsv
-- SQLINES DEMO *** -------------------------------------
-- SQLINES DEMO *** 4.0

/* SQLINES DEMO *** CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/* SQLINES DEMO *** CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/* SQLINES DEMO *** COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/* SQLINES DEMO ***  utf8 */;
/* SQLINES DEMO *** TIME_ZONE=@@TIME_ZONE */;
/* SQLINES DEMO *** ZONE='+00:00' */;
/* SQLINES DEMO *** UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/* SQLINES DEMO *** FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/* SQLINES DEMO *** SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/* SQLINES DEMO *** SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- SQLINES DEMO *** or table `attendance_sessions`
--

DROP TABLE IF EXISTS attendance_sessions;
/* SQLINES DEMO *** d_cs_client     = @@character_set_client */;
/* SQLINES DEMO *** cter_set_client = utf8mb4 */;
-- SQLINES FOR EVALUATION USE ONLY (14 DAYS)
CREATE TABLE attendance_sessions (
  id int NOT NULL GENERATED ALWAYS AS IDENTITY,
  class_id varchar(20) NOT NULL,
  slot_id int NOT NULL,
  day date NOT NULL,
  code varchar(16) NOT NULL,
  expires_at timestamp(0) NOT NULL,
  type varchar(30) check (type in ('qr','code','manual')) NOT NULL,
  status varchar(30) check (status in ('active','expired','closed')) NOT NULL DEFAULT 'active',
  attempts int NOT NULL DEFAULT '0',
  created_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
,
  CONSTRAINT attendance_sessions_class_fk FOREIGN KEY (class_id) REFERENCES classes (class_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT attendance_sessions_slot_fk FOREIGN KEY (slot_id) REFERENCES time_slots (slot_id) ON DELETE CASCADE ON UPDATE CASCADE
)  ;

ALTER SEQUENCE attendance_sessions_seq RESTART WITH 19;
/* SQLINES DEMO *** cter_set_client = @saved_cs_client */;

CREATE INDEX attendance_sessions_class_day_slot_idx ON attendance_sessions (class_id,day,slot_id);
CREATE INDEX attendance_sessions_slot_fk ON attendance_sessions (slot_id);

--
-- SQLINES DEMO *** table `attendance_sessions`
--

LOCK TABLES attendance_sessions WRITE;
/* SQLINES DEMO *** LE `attendance_sessions` DISABLE KEYS */;
INSERT INTO attendance_sessions VALUES (1,'SE19B3',1,'2025-10-29','62KRDV','2025-10-29 23:28:33','code','active',0,'2025-10-29 23:27:33','2025-10-29 23:27:33'),(2,'SE19B3',1,'2025-10-29','ZKYNSZ','2025-10-29 23:28:34','code','active',0,'2025-10-29 23:27:34','2025-10-29 23:27:34'),(3,'SE19B3',1,'2025-10-29','5YP2F3','2025-10-29 23:33:23','qr','active',0,'2025-10-29 23:32:23','2025-10-29 23:32:23'),(4,'SE19B3',1,'2025-10-29','7KYJ32','2025-10-29 23:35:29','code','active',3,'2025-10-29 23:33:07','2025-10-29 23:34:29'),(5,'SE19B3',1,'2025-10-29','GDLHLR','2025-10-29 23:36:04','qr','active',3,'2025-10-29 23:34:57','2025-10-29 23:35:04'),(6,'SE19B3',1,'2025-10-29','UTMGP8','2025-10-29 23:35:16','manual','active',0,'2025-10-29 23:35:16','2025-10-29 23:35:16'),(7,'SE19B3',1,'2025-10-29','RMZ5NZ','2025-10-29 23:35:24','manual','active',0,'2025-10-29 23:35:24','2025-10-29 23:35:24'),(8,'SE19B3',3,'2025-10-29','XX7WRT','2025-10-30 00:03:46','code','active',3,'2025-10-30 00:02:15','2025-10-30 00:02:46'),(9,'SE19B3',3,'2025-10-29','KCGGMM','2025-10-30 00:14:47','code','active',0,'2025-10-30 00:13:47','2025-10-30 00:13:47'),(10,'SE19B3',3,'2025-10-29','K9PLXK','2025-10-30 00:25:10','code','active',3,'2025-10-30 00:23:47','2025-10-30 00:24:10'),(11,'SE19B3',3,'2025-10-29','RGW5C3','2025-10-30 00:39:52','code','active',0,'2025-10-30 00:38:52','2025-10-30 00:38:52'),(12,'SE19B3',3,'2025-10-29','3KPLEC','2025-10-30 01:12:52','code','active',2,'2025-10-30 01:10:49','2025-10-30 01:11:52'),(13,'SE19B3',3,'2025-10-29','RWGAFB','2025-10-30 01:13:06','qr','active',0,'2025-10-30 01:12:06','2025-10-30 01:12:06'),(14,'SE19B3',1,'2025-10-29','XXA26Q','2025-10-30 01:15:34','qr','active',0,'2025-10-30 01:14:34','2025-10-30 01:14:34'),(15,'SE19B3',1,'2025-10-29','2ZN3KQ','2025-10-30 01:32:40','qr','active',0,'2025-10-30 01:31:40','2025-10-30 01:31:40'),(16,'SE19B3',3,'2025-10-29','S3SDAJ','2025-10-30 01:38:03','qr','active',0,'2025-10-30 01:37:03','2025-10-30 01:37:03'),(17,'SE19B3',3,'2025-10-29','Y94NRC','2025-10-30 01:39:24','code','active',0,'2025-10-30 01:38:24','2025-10-30 01:38:24'),(18,'SE19B3',3,'2025-10-29','BL58FT','2025-10-30 01:39:32','qr','active',0,'2025-10-30 01:38:32','2025-10-30 01:38:32');
/* SQLINES DEMO *** LE `attendance_sessions` ENABLE KEYS */;
UNLOCK TABLES;
/* SQLINES DEMO *** ZONE=@OLD_TIME_ZONE */;

/* SQLINES DEMO *** ODE=@OLD_SQL_MODE */;
/* SQLINES DEMO *** GN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/* SQLINES DEMO *** E_CHECKS=@OLD_UNIQUE_CHECKS */;
/* SQLINES DEMO *** CTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/* SQLINES DEMO *** CTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/* SQLINES DEMO *** TION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/* SQLINES DEMO *** OTES=@OLD_SQL_NOTES */;

-- SQLINES DEMO ***  2025-10-31 16:37:45
