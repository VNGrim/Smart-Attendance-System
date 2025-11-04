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
-- SQLINES DEMO *** or table `timetable`
--

DROP TABLE IF EXISTS timetable;
/* SQLINES DEMO *** d_cs_client     = @@character_set_client */;
/* SQLINES DEMO *** cter_set_client = utf8mb4 */;
-- SQLINES FOR EVALUATION USE ONLY (14 DAYS)
CREATE TABLE timetable (
  id int NOT NULL GENERATED ALWAYS AS IDENTITY,
  classes varchar(100) CHARACTER SET utf8mb4 NOT NULL,
  day_of_week varchar(30) check (day_of_week in ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')) CHARACTER SET utf8mb4 NOT NULL,
  slot_id int NOT NULL,
  room varchar(50) CHARACTER SET utf8mb4 NOT NULL,
  week_key varchar(20) NOT NULL DEFAULT 'UNASSIGNED',
  teacher_id varchar(20) DEFAULT NULL,
  teacher_name varchar(150) DEFAULT NULL,
  subject_name varchar(150) DEFAULT NULL,
  room_name varchar(150) DEFAULT NULL,
  PRIMARY KEY (id)
,
  CONSTRAINT timetable_ibfk_1 FOREIGN KEY (slot_id) REFERENCES time_slots (slot_id) ON DELETE CASCADE ON UPDATE CASCADE
)  ;

ALTER SEQUENCE timetable_seq RESTART WITH 10;
/* SQLINES DEMO *** cter_set_client = @saved_cs_client */;

CREATE INDEX slot_id ON timetable (slot_id);
CREATE INDEX timetable_week_slot_idx ON timetable (week_key,day_of_week,slot_id);
CREATE INDEX timetable_week_teacher_idx ON timetable (week_key,teacher_id);

--
-- SQLINES DEMO *** table `timetable`
--

LOCK TABLES timetable WRITE;
/* SQLINES DEMO *** LE `timetable` DISABLE KEYS */;
INSERT INTO timetable VALUES (7,'SE19B3','Thu',3,'','29/09 - 05/10','GV001','Đỗ Đình Văn','Programming Fundamentals',NULL),(8,'SE19B3','Thu',1,'','29/09 - 05/10','GV001','Đỗ Đình Văn','Programming Fundamentals',NULL),(9,'SE19B3','Mon',1,'','29/09 - 05/10','GV001','Đỗ Đình Văn','Programming Fundamentals',NULL);
/* SQLINES DEMO *** LE `timetable` ENABLE KEYS */;
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
