const express = require("express");
const router = express.Router();
const StudentController = require("./dangnhap_gv.controller");

// API login giảng viên
router.post("/login", StudentController.loginTeacher);

module.exports = router;
