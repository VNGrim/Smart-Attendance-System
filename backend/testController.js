const controller = require("./src/diemdanh_gv/attendance.controller");

const mockReq = {
  user: { userId: "GV001", role: "teacher" },
};

const mockRes = {
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    console.log("status", this.statusCode || 200);
    console.log(JSON.stringify(payload, null, 2));
  },
};

controller
  .listTeacherClasses(mockReq, mockRes)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
