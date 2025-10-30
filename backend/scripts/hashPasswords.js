// scripts/hashPasswords.js
import { fileURLToPath } from "url";
import path from "path";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import prisma from "../src/config/prisma.js";

// 🧩 Thiết lập đường dẫn tuyệt đối
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Nạp biến môi trường từ file .env (tự tìm trong thư mục gốc)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function hashPasswords() {
  try {
    console.log("🔄 Đang kết nối cơ sở dữ liệu...");
    const accounts = await prisma.accounts.findMany();

    if (!accounts || accounts.length === 0) {
      console.log("⚠️ Không có tài khoản nào trong bảng 'accounts'.");
      return;
    }

    console.log(`🔍 Tìm thấy ${accounts.length} tài khoản.`);

    for (const acc of accounts) {
      // Nếu mật khẩu chưa được hash (ít hơn 60 ký tự thường là plain text)
      if (!acc.password || acc.password.length < 60) {
        const hashedPassword = await bcrypt.hash(acc.password, 10);
        await prisma.accounts.update({
          where: { id: acc.id },
          data: { password: hashedPassword },
        });
        console.log(`✅ Đã băm mật khẩu cho: ${acc.user_code}`);
      } else {
        console.log(`⏩ Bỏ qua (đã băm): ${acc.user_code}`);
      }
    }

    console.log("🎉 Hoàn tất băm mật khẩu cho tất cả tài khoản.");
  } catch (error) {
    console.error("❌ Lỗi khi băm mật khẩu:", error);
  } finally {
    await prisma.$disconnect();
  }
}

hashPasswords();
