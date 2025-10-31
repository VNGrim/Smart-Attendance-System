const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const prisma = require("../config/prisma");

const router = express.Router();

// Cấu hình lưu file upload
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});
const upload = multer({ storage });

// POST /api/students/update-avatar
router.post("/update-avatar", upload.single("avatar"), async (req, res) => {
  console.log("📥 Received avatar upload request");
  console.log("📦 Body:", req.body);
  console.log("📎 File:", req.file);
  
  try {
    const { student_id } = req.body;
    if (!student_id) {
      console.error("❌ Missing student_id");
      return res.status(400).json({ success: false, message: "Thiếu student_id trong FormData" });
    }

    if (!req.file) {
      console.error("❌ No file uploaded");
      return res.status(400).json({ success: false, message: "Không có file được upload" });
    }

    const avatarPath = `/uploads/${req.file.filename}`;
    console.log("💾 Saving avatar path to DB:", avatarPath, "for student:", student_id);

    // ✅ Cập nhật avatar_url vào database
    try {
      const updateResult = await prisma.students.update({
        where: { student_id },
        data: { avatar_url: avatarPath },
      });
      console.log("✅ Database update result:", updateResult);
    } catch (dbError) {
      console.error("❌ Database update error:", dbError);
      throw dbError; // Re-throw để outer catch xử lý
    }

    console.log("✅ Avatar updated successfully");
    res.json({ success: true, avatar_url: avatarPath });
  } catch (err) {
    console.error("❌ Lỗi upload avatar:", err);
    console.error("❌ Error stack:", err.stack);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi upload avatar", error: err.message });
  }
});

// GET /api/students/:student_id - Kiểm tra avatar_url trong DB
router.get("/:student_id", async (req, res) => {
  try {
    const { student_id } = req.params;
    console.log("🔍 Getting student info for:", student_id);
    
    const student = await prisma.students.findUnique({
      where: { student_id },
      select: {
        student_id: true,
        full_name: true,
        avatar_url: true,
      },
    });
    
    console.log("📦 Student data from DB:", student);
    
    if (!student) {
      return res.status(404).json({ success: false, message: "Sinh viên không tồn tại" });
    }
    
    res.json({ success: true, data: student });
  } catch (err) {
    console.error("❌ Lỗi get student:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
