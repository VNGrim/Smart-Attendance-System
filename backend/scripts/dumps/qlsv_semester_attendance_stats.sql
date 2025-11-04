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
-- SQLINES DEMO *** or table `semester_attendance_stats`
--

DROP TABLE IF EXISTS semester_attendance_stats;
/* SQLINES DEMO *** d_cs_client     = @@character_set_client */;
/* SQLINES DEMO *** cter_set_client = utf8mb4 */;
-- SQLINES FOR EVALUATION USE ONLY (14 DAYS)
CREATE TABLE semester_attendance_stats (
  id int NOT NULL GENERATED ALWAYS AS IDENTITY,
  code varchar(20) CHARACTER SET utf8mb4 NOT NULL,
  name varchar(100) CHARACTER SET utf8mb4 NOT NULL,
  total_students int NOT NULL,
  attendance_ratio double precision NOT NULL,
  updated_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT semester_attendance_stats_code_key UNIQUE (code)
)  ;

ALTER SEQUENCE semester_attendance_stats_seq RESTART WITH 5;
/* SQLINES DEMO *** cter_set_client = @saved_cs_client */;

--
-- SQLINES DEMO *** table `semester_attendance_stats`
--

LOCK TABLES semester_attendance_stats WRITE;
/* SQLINES DEMO *** LE `semester_attendance_stats` DISABLE KEYS */;
INSERT INTO semester_attendance_stats VALUES (1,'K18','Khoá K18',2150,0.91,'2025-10-28 00:43:45'),(2,'K19','Khoá K19',2080,0.88,'2025-10-28 00:43:45'),(3,'K20','Khoá K20',1985,0.9,'2025-10-28 00:43:45'),(4,'K21','Khoá K21',1870,0.93,'2025-10-28 00:43:45');
/* SQLINES DEMO *** LE `semester_attendance_stats` ENABLE KEYS */;
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
