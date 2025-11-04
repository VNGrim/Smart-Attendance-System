const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const teachersController = require("./teachers.controller");
const { auth } = require("../middleware/auth");

// Cấu hình multer để upload avatar
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "teacher-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif)"));
  },
});

// Routes
router.get("/:teacherId", auth, teachersController.getTeacherInfo);
router.post("/update-avatar", upload.single("avatar"), teachersController.updateAvatar);

module.exports = router;
