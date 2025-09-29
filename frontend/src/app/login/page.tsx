"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Component trang đăng nhập
 * Hỗ trợ đăng nhập cho 3 loại người dùng:
 * - Sinh viên (SVxxx): Sau khi đăng nhập sẽ chuyển đến trang thông báo
 * - Giáo viên (GVxxx): Đăng nhập thành công, hiển thị thông báo
 * - Admin (ADxxx/ADMIN): Đăng nhập thành công, hiển thị thông báo
 */
export default function LoginPage() {
  // State quản lý form đăng nhập
  const [userId, setUserId] = useState(""); // Mã đăng nhập: SVxxx, GVxxx, ADxxx, ADMIN
  const [password, setPassword] = useState(""); // Mật khẩu người dùng
  const [loading, setLoading] = useState(false); // Trạng thái loading khi gọi API
  const [message, setMessage] = useState<string | null>(null); // Thông báo từ backend

  const router = useRouter();

  /**
   * Hàm xử lý đăng nhập
   * Gửi thông tin đăng nhập đến backend và xử lý response
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Ngăn reload trang khi submit
    setMessage(null); // Reset thông báo trước đó
    setLoading(true); // Bắt đầu loading

    // Kiểm tra input có rỗng không
    if (!userId || !password) {
      setMessage("Vui lòng nhập đầy đủ mã đăng nhập và mật khẩu");
      setLoading(false);
      return;
    }

    try {
      // Gửi request đăng nhập đến backend
      const res = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }), // Gửi userId và password
      });

      const data = await res.json();

      // Kiểm tra đăng nhập có thành công không
      if (!res.ok || !data?.success) {
        setMessage(data?.message || "Đăng nhập thất bại");
        return;
      }

      // Lưu thông tin phiên vào localStorage để các trang khác dùng
      try {
        localStorage.setItem("sas_user", JSON.stringify({
          userId: data.userId,
          role: data.role,
          name: data.name
        }));
      } catch {}

      // Đăng nhập thành công - xử lý theo từng loại người dùng
      if (data.role === "student") {
        // SINH VIÊN: Chuyển đến trang thông báo
        setMessage(`Chào mừng ${data.name}! Đang chuyển đến trang thông báo...`);
        setTimeout(() => {
          router.push("/thongbao_sv"); // Chuyển đến trang thông báo
        }, 1500);
      } else if (data.role === "teacher") {
        // GIÁO VIÊN: Đăng nhập thành công, hiển thị thông báo
        setMessage(`Đăng nhập thành công! Chào mừng ${data.name} (Giáo viên)`);
      } else if (data.role === "admin") {
        // ADMIN: Đăng nhập thành công, hiển thị thông báo
        setMessage(`Đăng nhập thành công! Chào mừng ${data.name} (Quản trị viên)`);
      }
    } catch (err) {
      // Xử lý lỗi kết nối
      setMessage("Không thể kết nối máy chủ. Hãy đảm bảo backend đang chạy ở cổng 8080.");
    } finally {
      setLoading(false); // Kết thúc loading
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Card đăng nhập */}
      <div className="login-card w-[360px] sm:w-[420px] px-8 py-8 border border-black/20 rounded-[28px] relative">
        
        {/* Header: Logo và tiêu đề */}
        <div className="flex flex-col items-center gap-2">
          <Image src="/logo-hat.svg" alt="Logo trường" width={36} height={36} />
          <h1 className="text-3xl font-extrabold tracking-tight">Đăng nhập</h1>
        </div>

        {/* Form đăng nhập */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          {/* Input mã đăng nhập */}
          <input
            className="input-soft rounded-xl h-11 w-full px-4 text-[15px] text-black/80 outline-none"
            placeholder="Mã đăng nhập (SV001, GV001, AD001...)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            autoComplete="username"
            disabled={loading} // Disable khi đang loading
          />
          
          {/* Input mật khẩu */}
          <input
            className="input-soft rounded-xl h-11 w-full px-4 text-[15px] text-black/80 outline-none"
            placeholder="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading} // Disable khi đang loading
          />
          
          {/* Link quên mật khẩu */}
          <div className="text-right text-sm text-muted cursor-pointer select-none">
            Quên mật khẩu
          </div>

          {/* Nút đăng nhập */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-2 w-full h-11 rounded-full text-white font-semibold disabled:opacity-60"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        {/* Hiển thị thông báo từ backend */}
        {message && (
          <div className="mt-3 text-sm text-center text-black/80">{message}</div>
        )}

        {/* Divider */}
        <div className="mt-4 text-center text-sm text-black/70">Hoặc</div>

        {/* Nút đăng nhập với Google (chưa implement) */}
        <button 
          className="mt-3 w-full h-11 rounded-full bg-black/5 flex items-center justify-center gap-3 text-black/60"
          disabled={loading}
        >
          <Image src="/google.svg" alt="Google" width={20} height={20} />
          <span>Đăng nhập với Google</span>
        </button>
      </div>
    </div>
  );
}
