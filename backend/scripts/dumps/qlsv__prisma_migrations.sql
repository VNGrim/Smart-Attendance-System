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
-- SQLINES DEMO *** or table `_prisma_migrations`
--

DROP TABLE IF EXISTS _prisma_migrations;
/* SQLINES DEMO *** d_cs_client     = @@character_set_client */;
/* SQLINES DEMO *** cter_set_client = utf8mb4 */;
-- SQLINES FOR EVALUATION USE ONLY (14 DAYS)
CREATE TABLE _prisma_migrations (
  id varchar(36) CHARACTER SET utf8mb4 NOT NULL,
  checksum varchar(64) CHARACTER SET utf8mb4 NOT NULL,
  finished_at timestamp(3) DEFAULT NULL,
  migration_name varchar(255) CHARACTER SET utf8mb4 NOT NULL,
  logs text CHARACTER SET utf8mb4,
  rolled_back_at timestamp(3) DEFAULT NULL,
  started_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  applied_steps_count int check (applied_steps_count > 0) NOT NULL DEFAULT '0',
  PRIMARY KEY (id)
) ;
/* SQLINES DEMO *** cter_set_client = @saved_cs_client */;

--
-- SQLINES DEMO *** table `_prisma_migrations`
--

LOCK TABLES _prisma_migrations WRITE;
/* SQLINES DEMO *** LE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO _prisma_migrations VALUES ('0a29f29b-bfbe-46f6-bb8e-10ee6c09e715','1526368d3f8d5a72c0ea9034e28e204a0ef672f408c377b441d736dde287ac71','2025-10-30 03:29:54.292','20251030032953_attendance_sessions',NULL,NULL,'2025-10-30 03:29:53.988',1),('1ebc0635-4f97-4afb-9905-8cc191e1eb00','ba986356af366969cf69c17f8435f89dfc818c3a27fcae0db5f479f340e2268a','2025-10-27 17:37:27.154','000_init',NULL,NULL,'2025-10-27 17:37:26.786',1),('3aeffde2-9cd1-4d96-8024-1cea9149ebbf','e47af8fa31ce8c7165e3b8ea98167414f204c01d72e5e719d4204c84468e47ae','2025-10-29 23:28:03.498','20251029232803_admin_schedule_enhancements',NULL,NULL,'2025-10-29 23:28:03.442',1),('785274f5-1f5a-4c06-9505-e4000e8c5078','31d79c7c7fe90a77052808eb70b081fd77515c29be1b2a3365ed16b2f6454963','2025-10-27 17:37:27.209','20251028_add_student_profile',NULL,NULL,'2025-10-27 17:37:27.156',1),('9bc95ecc-1d71-496e-9aa3-f01745ce44b6','d8a54b2ff5b1937a43ab74177dac2f397f4f96f22f9d3c5b276cb97dbdc891ea','2025-10-28 09:53:50.077','20251028095349_add_lecturer_management',NULL,NULL,'2025-10-28 09:53:50.013',1),('d4ffed2e-f681-43bb-b7e4-9b8af3bdb9c1','4c3b2c67cf16a8dedda06af92f3d5ca146aca4f9ce3699709370f86665e03918','2025-10-29 23:28:02.712','20251101_admin_schedule_enhancements',NULL,NULL,'2025-10-29 23:28:02.580',1),('d9479e99-cdbf-4c43-b8f8-e2df28a299bb','ab2692326d1b0dcec4a5ce219f9d0f3cb1223f2625502901f12320a9a1325e0e','2025-10-28 07:43:13.222','20251028_add_cohorts_table','',NULL,'2025-10-28 07:43:13.222',0),('dca9c8ca-f984-4cc8-8d07-804ce3991b25','ab2692326d1b0dcec4a5ce219f9d0f3cb1223f2625502901f12320a9a1325e0e',NULL,'20251028_add_cohorts_table','A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolvennMigration name: 20251028_add_cohorts_tablennDatabase error code: 1050nnDatabase error:nTable 'cohorts' already existsnnPlease check the query number 1 from the migration file.nn   0: sql_schema_connector::apply_migration::apply_scriptn           with migration_name="20251028_add_cohorts_table"n             at schema-engineconnectorssql-schema-connectorsrcapply_migration.rs:113n   1: schema_commands::commands::apply_migrations::Applying migrationn           with migration_name="20251028_add_cohorts_table"n             at schema-enginecommandssrccommandsapply_migrations.rs:95n   2: schema_core::state::ApplyMigrationsn             at schema-enginecoresrcstate.rs:260','2025-10-28 07:43:13.219','2025-10-28 07:42:57.302',0),('f02e4feb-7adf-4659-aa24-f94af2b4f322','ff92a22ce51ff44352a695d1bf6ce32364de26891da49ddc275d95b6a34901dc','2025-10-28 17:31:31.488','20241028_add_classes_table',NULL,NULL,'2025-10-28 17:31:31.398',1);
/* SQLINES DEMO *** LE `_prisma_migrations` ENABLE KEYS */;
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
