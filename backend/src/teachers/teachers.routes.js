const express = require("express");
const router = express.Router();
const teachersController = require("./teachers.controller");
const { auth } = require("../middleware/auth");

// Routes
router.get("/:teacherId", auth, teachersController.getTeacherInfo);

// Cập nhật avatar giảng viên: nhận JSON { teacher_id, avatar_url }
router.post("/update-avatar", auth, teachersController.updateAvatar);

module.exports = router;
