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
-- SQLINES DEMO *** or table `classes`
--

DROP TABLE IF EXISTS classes;
/* SQLINES DEMO *** d_cs_client     = @@character_set_client */;
/* SQLINES DEMO *** cter_set_client = utf8mb4 */;
-- SQLINES FOR EVALUATION USE ONLY (14 DAYS)
CREATE TABLE classes (
  class_id varchar(20) NOT NULL,
  class_name varchar(150) NOT NULL,
  subject_code varchar(20) NOT NULL,
  subject_name varchar(150) NOT NULL,
  cohort varchar(10) NOT NULL,
  major varchar(100) DEFAULT NULL,
  teacher_id varchar(20) DEFAULT NULL,
  status varchar(30) NOT NULL DEFAULT 'Đang hoạt động',
  room varchar(50) DEFAULT NULL,
  schedule varchar(255) DEFAULT NULL,
  semester varchar(20) DEFAULT NULL,
  school_year varchar(20) DEFAULT NULL,
  description text,
  created_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP /* ON UPDATE CURRENT_TIMESTAMP */,
  PRIMARY KEY (class_id)
,
  CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers (teacher_id) ON DELETE SET NULL
) ;

CREATE INDEX classes_teacher_idx ON classes (teacher_id);
CREATE INDEX classes_cohort_idx ON classes (cohort);
/* SQLINES DEMO *** cter_set_client = @saved_cs_client */;

--
-- SQLINES DEMO *** table `classes`
--

LOCK TABLES classes WRITE;
/* SQLINES DEMO *** LE `classes` DISABLE KEYS */;
INSERT INTO classes VALUES ('SE19B3','Programming Fundamentals','PRF192','Programming Fundamentals','K19',NULL,'GV001','Đang hoạt động',NULL,NULL,NULL,NULL,'Programming Fundamentals','2025-10-29 08:53:51','2025-10-29 08:53:51');
/* SQLINES DEMO *** LE `classes` ENABLE KEYS */;
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
