const express = require("express");
const router = express.Router();
const StudentController = require("./dangnhap_sv.controller");

// API login sinh viên
router.post("/login", StudentController.loginStudent);

module.exports = router;