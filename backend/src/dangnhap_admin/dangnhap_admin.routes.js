const express = require("express");
const router = express.Router();
const StudentController = require("./dangnhap_admin.controller");

// API login quản trị viên
router.post("/login", StudentController.loginAdmin);

module.exports = router;
