"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { makeApiUrl } from "../../lib/apiBase";

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
  const [showPassword, setShowPassword] = useState(false); // Hiển thị/ẩn mật khẩu
  const [rememberMe, setRememberMe] = useState(false); // Ghi nhớ đăng nhập
  const [isDarkMode, setIsDarkMode] = useState(false); // Dark mode toggle

  const router = useRouter();

  // Khởi tạo theme từ localStorage hoặc system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldUseDark);
    document.documentElement.setAttribute('data-theme', shouldUseDark ? 'dark' : 'light');
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

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
      const res = await fetch(makeApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }), // Gửi userId và password
        credentials: "include",
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
          name: data.name,
          teacher_id: data.teacher_id,
          full_name: data.full_name,
          token: data.token,
        }));
      } catch {}

      // Đăng nhập thành công - xử lý theo từng loại người dùng
      if (data.role === "student") {
        // SINH VIÊN: Chuyển đến trang tổng quan sinh viên
        setMessage(`Chào mừng ${data.name}! Đang chuyển đến Dashboard sinh viên...`);
        setTimeout(() => {
          router.push("/tongquan_sv");
        }, 1000);
      } else if (data.role === "teacher") {
        // GIÁO VIÊN: Chuyển đến trang tổng quan giảng viên
        setMessage(`Chào mừng ${data.name}! Đang chuyển đến Dashboard giảng viên...`);
        setTimeout(() => {
          router.push("/tongquan_gv");
        }, 1000);
      } else if (data.role === "admin") {
        // ADMIN: Đăng nhập thành công, chuyển đến Dashboard admin
        setMessage(`Đăng nhập thành công! Chào mừng ${data.name} (Quản trị viên)`);
        setTimeout(() => {
          router.push("/tongquan_ad");
        }, 1000);
      }
    } catch (err) {
      // Xử lý lỗi kết nối
      setMessage("Không thể kết nối máy chủ. Hãy đảm bảo backend đang chạy ở cổng 8080.");
    } finally {
      setLoading(false); // Kết thúc loading
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Brand logo */}
      <div className="brand-logo">
        <Image src="/logo.png" alt="Trường Đại học" width={32} height={32} />
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDarkMode}
        className="theme-toggle"
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>

      {/* Card đăng nhập */}
      <div className="login-card w-[360px] sm:w-[420px] px-8 py-10 relative">
        
        {/* Header: Logo và tiêu đề */}
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="logo-container p-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg logo-glow">
            <Image 
              src="/logo-hat.svg" 
              alt="Logo trường" 
              width={36} 
              height={36} 
              className="text-white"
            />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Đăng nhập</h1>
            <p className="text-sm text-muted">Đăng nhập bằng mã trường</p>
          </div>
        </div>

        {/* Form đăng nhập */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input mã đăng nhập */}
          <div className="space-y-1">
            <input
              className="input-soft rounded-xl h-12 w-full px-4 pr-4 text-[15px] outline-none"
              placeholder="Mã đăng nhập (SV001, GV001, AD001...)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              autoComplete="username"
              disabled={loading}
            />
          </div>
          
          {/* Input mật khẩu với toggle visibility */}
          <div className="relative space-y-1">
            <input
              className="input-soft rounded-xl h-12 w-full px-4 pr-12 text-[15px] outline-none"
              placeholder="Mật khẩu"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle"
              disabled={loading}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          {/* Remember me và Forgot password */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="checkbox-custom"
                disabled={loading}
              />
              <span className="text-muted">Ghi nhớ đăng nhập</span>
            </label>
            <button
              type="button"
              className="link-primary text-sm"
              disabled={loading}
            >
              Quên mật khẩu?
            </button>
          </div>

          {/* Nút đăng nhập */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full h-12 rounded-xl text-white font-semibold disabled:opacity-60"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Đang đăng nhập...
              </div>
            ) : (
              "Đăng nhập"
            )}
          </button>
        </form>

        {/* Hiển thị thông báo từ backend */}
        {message && (
          <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-center text-blue-700 dark:text-blue-300">
            {message}
          </div>
        )}

        {/* Footer links */}
        <div className="mt-8 text-center">
          <p className="text-xs text-secondary">
            <button className="link-primary">Liên hệ hỗ trợ</button>
          </p>
        </div>
      </div>
    </div>
  );
}
