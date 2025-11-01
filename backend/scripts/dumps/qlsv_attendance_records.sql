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
-- SQLINES DEMO *** or table `attendance_records`
--

DROP TABLE IF EXISTS attendance_records;
/* SQLINES DEMO *** d_cs_client     = @@character_set_client */;
/* SQLINES DEMO *** cter_set_client = utf8mb4 */;
-- SQLINES FOR EVALUATION USE ONLY (14 DAYS)
CREATE TABLE attendance_records (
  id int NOT NULL GENERATED ALWAYS AS IDENTITY,
  session_id int NOT NULL,
  student_id varchar(20) NOT NULL,
  status varchar(30) check (status in ('present','absent','excused')) NOT NULL DEFAULT 'present',
  marked_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note varchar(255) DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT attendance_records_session_student_unique UNIQUE (session_id,student_id)
,
  CONSTRAINT attendance_records_session_fk FOREIGN KEY (session_id) REFERENCES attendance_sessions (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT attendance_records_student_fk FOREIGN KEY (student_id) REFERENCES students (student_id) ON DELETE CASCADE ON UPDATE CASCADE
)  ;

ALTER SEQUENCE attendance_records_seq RESTART WITH 6;
/* SQLINES DEMO *** cter_set_client = @saved_cs_client */;

CREATE INDEX attendance_records_student_idx ON attendance_records (student_id);

--
-- SQLINES DEMO *** table `attendance_records`
--

LOCK TABLES attendance_records WRITE;
/* SQLINES DEMO *** LE `attendance_records` DISABLE KEYS */;
INSERT INTO attendance_records VALUES (1,7,'SE190001','present','2025-10-29 23:35:25',NULL),(2,10,'SE190001','present','2025-10-30 00:23:56',NULL),(3,12,'SE190001','present','2025-10-30 01:11:33',NULL),(4,13,'SE190001','present','2025-10-30 01:12:37',NULL),(5,16,'SE190001','present','2025-10-30 01:38:03',NULL);
/* SQLINES DEMO *** LE `attendance_records` ENABLE KEYS */;
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
