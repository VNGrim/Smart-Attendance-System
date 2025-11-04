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
-- SQLINES DEMO *** or table `announcements`
--

DROP TABLE IF EXISTS announcements;
/* SQLINES DEMO *** d_cs_client     = @@character_set_client */;
/* SQLINES DEMO *** cter_set_client = utf8mb4 */;
-- SQLINES FOR EVALUATION USE ONLY (14 DAYS)
CREATE TABLE announcements (
  id int NOT NULL GENERATED ALWAYS AS IDENTITY,
  title varchar(200) CHARACTER SET utf8mb4 NOT NULL,
  content text CHARACTER SET utf8mb4 NOT NULL,
  created_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  category varchar(50) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'general',
  code varchar(64) CHARACTER SET utf8mb4 DEFAULT NULL,
  history json DEFAULT NULL,
  recipients json DEFAULT NULL,
  scheduled_at timestamp(0) NULL DEFAULT NULL,
  send_time timestamp(0) NULL DEFAULT NULL,
  sender varchar(100) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Admin',
  status varchar(30) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Đã gửi',
  target varchar(255) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Toàn trường',
  type varchar(50) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Khác',
  updated_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT announcements_code_key UNIQUE (code)
)  ;

ALTER SEQUENCE announcements_seq RESTART WITH 3;
/* SQLINES DEMO *** cter_set_client = @saved_cs_client */;

CREATE INDEX announcements_created_at_idx ON announcements (created_at);

--
-- SQLINES DEMO *** table `announcements`
--

LOCK TABLES announcements WRITE;
/* SQLINES DEMO *** LE `announcements` DISABLE KEYS */;
INSERT INTO announcements VALUES (1,'hihiu','hohodaw','2025-10-27 10:46:22','sinhvien','afad198a-068f-45ca-9946-9e3c1975e455',NULL,NULL,NULL,'2025-10-27 10:46:22','Admin','Đã gửi','Tất cả sinh viên','Học vụ','2025-10-27 10:46:22'),(2,'Đại đi','Đại luôn','2025-10-29 20:01:44','sinhvien','5e07407a-efa6-4977-b5ea-473a63438b73',NULL,NULL,NULL,'2025-10-29 20:01:44','Admin','Đã gửi','Tất cả sinh viên','Học vụ','2025-10-29 20:01:44');
/* SQLINES DEMO *** LE `announcements` ENABLE KEYS */;
UNLOCK TABLES;
/* SQLINES DEMO *** ZONE=@OLD_TIME_ZONE */;

/* SQLINES DEMO *** ODE=@OLD_SQL_MODE */;
/* SQLINES DEMO *** GN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/* SQLINES DEMO *** E_CHECKS=@OLD_UNIQUE_CHECKS */;
/* SQLINES DEMO *** CTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/* SQLINES DEMO *** CTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/* SQLINES DEMO *** TION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/* SQLINES DEMO *** OTES=@OLD_SQL_NOTES */;

-- SQLINES DEMO ***  2025-10-31 16:37:44
