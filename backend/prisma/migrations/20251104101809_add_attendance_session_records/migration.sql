-- CreateEnum
CREATE TYPE "timetable_day_of_week" AS ENUM ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun');

-- CreateEnum
CREATE TYPE "accounts_role" AS ENUM ('student', 'teacher', 'admin');

-- CreateEnum
CREATE TYPE "student_status" AS ENUM ('active', 'locked');

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "user_code" VARCHAR(20) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "accounts_role" NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" VARCHAR(50) NOT NULL DEFAULT 'general',
    "code" VARCHAR(64),
    "history" JSONB,
    "recipients" JSONB,
    "allow_reply" BOOLEAN NOT NULL DEFAULT false,
    "reply_until" TIMESTAMP(0),
    "scheduled_at" TIMESTAMP(0),
    "send_time" TIMESTAMP(0),
    "sender" VARCHAR(100) NOT NULL DEFAULT 'Admin',
    "status" VARCHAR(30) NOT NULL DEFAULT 'Đã gửi',
    "target" VARCHAR(255) NOT NULL DEFAULT 'Toàn trường',
    "type" VARCHAR(50) NOT NULL DEFAULT 'Khác',
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_replies" (
    "id" SERIAL NOT NULL,
    "announcement_id" INTEGER NOT NULL,
    "author_type" VARCHAR(20) NOT NULL,
    "author_code" VARCHAR(50),
    "author_name" VARCHAR(150),
    "author_class" VARCHAR(100),
    "author_subject" VARCHAR(150),
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(0),
    "metadata" JSONB,

    CONSTRAINT "announcement_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "student_id" VARCHAR(20) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "course" VARCHAR(10) NOT NULL,
    "classes" VARCHAR(255),
    "major" VARCHAR(100),
    "advisor_name" VARCHAR(100),
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "avatar_url" VARCHAR(255),
    "status" "student_status" NOT NULL DEFAULT 'active',
    "account_id" INTEGER,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "teacher_id" VARCHAR(20) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "subject" VARCHAR(100) NOT NULL,
    "classes" VARCHAR(255),
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "faculty" VARCHAR(100),
    "avatar_url" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL DEFAULT 'Đang dạy',
    "account_id" INTEGER,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("teacher_id")
);

-- CreateTable
CREATE TABLE "classes" (
    "class_id" VARCHAR(20) NOT NULL,
    "class_name" VARCHAR(150) NOT NULL,
    "subject_code" VARCHAR(20) NOT NULL,
    "subject_name" VARCHAR(150) NOT NULL,
    "cohort" VARCHAR(10) NOT NULL,
    "major" VARCHAR(100),
    "teacher_id" VARCHAR(20),
    "status" VARCHAR(30) NOT NULL DEFAULT 'Đang hoạt động',
    "room" VARCHAR(50),
    "schedule" VARCHAR(255),
    "semester" VARCHAR(20),
    "school_year" VARCHAR(20),
    "description" TEXT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("class_id")
);

-- CreateTable
CREATE TABLE "time_slots" (
    "slot_id" INTEGER NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("slot_id")
);

-- CreateTable
CREATE TABLE "timetable" (
    "id" SERIAL NOT NULL,
    "classes" VARCHAR(100) NOT NULL,
    "day_of_week" "timetable_day_of_week" NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "room" VARCHAR(50) NOT NULL,
    "week_key" VARCHAR(20) NOT NULL DEFAULT 'UNASSIGNED',
    "date" DATE,
    "teacher_id" VARCHAR(20),
    "teacher_name" VARCHAR(150),
    "subject_name" VARCHAR(150),
    "room_name" VARCHAR(150),

    CONSTRAINT "timetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "room_id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150),
    "capacity" INTEGER,
    "location" VARCHAR(150),
    "notes" TEXT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "teacher_availability" (
    "id" SERIAL NOT NULL,
    "teacher_id" VARCHAR(20) NOT NULL,
    "day_of_week" "timetable_day_of_week" NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "teacher_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" TEXT NOT NULL,
    "class_id" VARCHAR(20) NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "day" DATE NOT NULL,
    "method" VARCHAR(16) NOT NULL,
    "code" VARCHAR(16),
    "created_by" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(0),
    "status" VARCHAR(16) NOT NULL,
    "total_students" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "student_id" VARCHAR(20) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "recorded_at" TIMESTAMP(0),
    "modified_by" VARCHAR(20),
    "modified_at" TIMESTAMP(0),

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_availability" (
    "id" SERIAL NOT NULL,
    "room_code" VARCHAR(50) NOT NULL,
    "day_of_week" "timetable_day_of_week" NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "room_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semester_attendance_stats" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "total_students" INTEGER NOT NULL,
    "attendance_ratio" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "semester_attendance_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohorts" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "original" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_code" ON "accounts"("user_code");

-- CreateIndex
CREATE UNIQUE INDEX "announcements_code_key" ON "announcements"("code");

-- CreateIndex
CREATE INDEX "announcements_created_at_idx" ON "announcements"("created_at");

-- CreateIndex
CREATE INDEX "announcement_replies_announcement_idx" ON "announcement_replies"("announcement_id");

-- CreateIndex
CREATE INDEX "announcement_replies_author_idx" ON "announcement_replies"("author_code");

-- CreateIndex
CREATE INDEX "announcement_replies_read_idx" ON "announcement_replies"("read_at");

-- CreateIndex
CREATE INDEX "students_account_id_idx" ON "students"("account_id");

-- CreateIndex
CREATE INDEX "teachers_account_id_idx" ON "teachers"("account_id");

-- CreateIndex
CREATE INDEX "classes_teacher_idx" ON "classes"("teacher_id");

-- CreateIndex
CREATE INDEX "classes_cohort_idx" ON "classes"("cohort");

-- CreateIndex
CREATE INDEX "time_slots_slot_idx" ON "time_slots"("slot_id");

-- CreateIndex
CREATE INDEX "timetable_week_slot_idx" ON "timetable"("week_key", "day_of_week", "slot_id");

-- CreateIndex
CREATE INDEX "timetable_week_teacher_idx" ON "timetable"("week_key", "teacher_id");

-- CreateIndex
CREATE INDEX "slot_id" ON "timetable"("slot_id");

-- CreateIndex
CREATE INDEX "timetable_date_idx" ON "timetable"("date");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");

-- CreateIndex
CREATE INDEX "teacher_availability_idx" ON "teacher_availability"("teacher_id", "day_of_week", "slot_id");

-- CreateIndex
CREATE INDEX "teacher_availability_slot_idx" ON "teacher_availability"("slot_id");

-- CreateIndex
CREATE INDEX "attendance_sessions_class_day_slot_idx" ON "attendance_sessions"("class_id", "day", "slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_class_id_day_slot_id_key" ON "attendance_sessions"("class_id", "day", "slot_id");

-- CreateIndex
CREATE INDEX "attendance_records_student_idx" ON "attendance_records"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_session_student_unique" ON "attendance_records"("session_id", "student_id");

-- CreateIndex
CREATE INDEX "room_availability_idx" ON "room_availability"("room_code", "day_of_week", "slot_id");

-- CreateIndex
CREATE INDEX "room_availability_slot_idx" ON "room_availability"("slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "semester_attendance_stats_code_key" ON "semester_attendance_stats"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cohorts_code_key" ON "cohorts"("code");

-- CreateIndex
CREATE INDEX "cohorts_year_idx" ON "cohorts"("year");

-- AddForeignKey
ALTER TABLE "announcement_replies" ADD CONSTRAINT "announcement_replies_announcement_fk" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_ibfk_1" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_ibfk_1" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "timetable" ADD CONSTRAINT "timetable_ibfk_1" FOREIGN KEY ("slot_id") REFERENCES "time_slots"("slot_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_availability" ADD CONSTRAINT "teacher_availability_slot_fk" FOREIGN KEY ("slot_id") REFERENCES "time_slots"("slot_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teacher_availability" ADD CONSTRAINT "teacher_availability_teacher_fk" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_class_fk" FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_slot_fk" FOREIGN KEY ("slot_id") REFERENCES "time_slots"("slot_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_fk" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_fk" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_availability" ADD CONSTRAINT "room_availability_room_fk" FOREIGN KEY ("room_code") REFERENCES "rooms"("code") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_availability" ADD CONSTRAINT "room_availability_slot_fk" FOREIGN KEY ("slot_id") REFERENCES "time_slots"("slot_id") ON DELETE CASCADE ON UPDATE NO ACTION;
