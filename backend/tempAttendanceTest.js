const { getClassesByTeacher } = require("./src/diemdanh_gv/attendance.model");

(async () => {
  try {
    const classes = await getClassesByTeacher("GV001");
    console.log(classes);
  } catch (err) {
    console.error("Error", err);
  } finally {
    process.exit(0);
  }
})();
