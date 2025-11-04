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
-- SQLINES DEMO *** or table `teachers`
--

DROP TABLE IF EXISTS teachers;
/* SQLINES DEMO *** d_cs_client     = @@character_set_client */;
/* SQLINES DEMO *** cter_set_client = utf8mb4 */;
-- SQLINES FOR EVALUATION USE ONLY (14 DAYS)
CREATE TABLE teachers (
  teacher_id varchar(20) CHARACTER SET utf8mb4 NOT NULL,
  full_name varchar(100) CHARACTER SET utf8mb4 NOT NULL,
  subject varchar(100) CHARACTER SET utf8mb4 NOT NULL,
  classes varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  account_id int DEFAULT NULL,
  created_at timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP,
  email varchar(100) DEFAULT NULL,
  faculty varchar(100) DEFAULT NULL,
  phone varchar(20) DEFAULT NULL,
  status varchar(50) NOT NULL DEFAULT 'Đang dạy',
  updated_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (teacher_id)
,
  CONSTRAINT teachers_ibfk_1 FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
) ;

CREATE INDEX account_id ON teachers (account_id);
/* SQLINES DEMO *** cter_set_client = @saved_cs_client */;

--
-- SQLINES DEMO *** table `teachers`
--

LOCK TABLES teachers WRITE;
/* SQLINES DEMO *** LE `teachers` DISABLE KEYS */;
INSERT INTO teachers VALUES ('GV001','Đỗ Đình Văn','Chưa phân công',NULL,4,'2025-10-28 02:56:15','dodinhvan01@gmail.com','Chưa cập nhật','0399956930','Đang dạy','2025-10-28 02:56:15');
/* SQLINES DEMO *** LE `teachers` ENABLE KEYS */;
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
