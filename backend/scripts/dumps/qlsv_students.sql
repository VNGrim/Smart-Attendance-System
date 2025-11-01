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
-- SQLINES DEMO *** or table `students`
--

DROP TABLE IF EXISTS students;
/* SQLINES DEMO *** d_cs_client     = @@character_set_client */;
/* SQLINES DEMO *** cter_set_client = utf8mb4 */;
-- SQLINES FOR EVALUATION USE ONLY (14 DAYS)
CREATE TABLE students (
  student_id varchar(20) CHARACTER SET utf8mb4 NOT NULL,
  full_name varchar(100) CHARACTER SET utf8mb4 NOT NULL,
  course varchar(10) CHARACTER SET utf8mb4 NOT NULL,
  classes varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  account_id int DEFAULT NULL,
  created_at timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP,
  major varchar(100) CHARACTER SET utf8mb4 DEFAULT NULL,
  advisor_name varchar(100) CHARACTER SET utf8mb4 DEFAULT NULL,
  email varchar(100) CHARACTER SET utf8mb4 DEFAULT NULL,
  phone varchar(20) CHARACTER SET utf8mb4 DEFAULT NULL,
  avatar_url varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  status varchar(30) check (status in ('active','locked')) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'active',
  updated_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP /* ON UPDATE CURRENT_TIMESTAMP */,
  PRIMARY KEY (student_id)
,
  CONSTRAINT students_ibfk_1 FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
) ;

CREATE INDEX account_id ON students (account_id);
/* SQLINES DEMO *** cter_set_client = @saved_cs_client */;

--
-- SQLINES DEMO *** table `students`
--

LOCK TABLES students WRITE;
/* SQLINES DEMO *** LE `students` DISABLE KEYS */;
INSERT INTO students VALUES ('SE180001','KOPDAW','K18',NULL,3,'2025-10-28 01:24:56',NULL,NULL,'kdpwa@gmail.com',NULL,NULL,'active','2025-10-28 01:24:56'),('SE190001','Đỗ Đình Văn','K19','SE19B3',2,'2025-10-28 01:19:18',NULL,NULL,'dodinhvan01@gmail.com',NULL,'/uploads/1761902789533-762634816.png','active','2025-10-31 02:26:30');
/* SQLINES DEMO *** LE `students` ENABLE KEYS */;
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
