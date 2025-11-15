const express = require("express");
const prisma = require("../config/prisma");

const router = express.Router();

// POST /api/students/update-avatar
// Body JSON: { student_id: string, avatar_url: string }
router.post("/update-avatar", async (req, res) => {
  try {
    const { student_id, avatar_url } = req.body || {};
    console.log("📥 Received avatar URL update", { student_id, avatar_url });
    if (!student_id || typeof student_id !== "string") {
      return res.status(400).json({ success: false, message: "Thiếu hoặc sai student_id" });
    }
    if (!avatar_url || typeof avatar_url !== "string") {
      return res.status(400).json({ success: false, message: "Thiếu avatar_url" });
    }

    const updated = await prisma.students.update({
      where: { student_id },
      data: { avatar_url },
    });
    console.log("✅ Avatar URL saved to DB", { student_id, avatar_url });
    return res.json({ success: true, avatar_url: updated.avatar_url });
  } catch (err) {
    console.error("❌ Lỗi update avatar_url:", err);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ khi cập nhật avatar", error: err.message });
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
