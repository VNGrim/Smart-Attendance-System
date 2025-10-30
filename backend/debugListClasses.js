const { getClassesByTeacher } = require("./src/diemdanh_gv/attendance.model");

(async () => {
  try {
    const rows = await getClassesByTeacher("GV001");
    const data = rows.map((row) => ({
      id: row.class_id,
      code: row.class_id,
      name: row.class_name,
      subjectName: row.subject_name,
      subjectCode: row.subject_code,
      semester: row.semester,
      schoolYear: row.school_year,
      status: row.status,
      studentCount: Number(row.student_count || 0),
    }));
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("error", err);
  } finally {
    process.exit(0);
  }
})();
