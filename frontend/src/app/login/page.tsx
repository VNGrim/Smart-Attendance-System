"use client";

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, password }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setMessage(data?.message || "Đăng nhập thất bại");
        return;
      }
      setMessage(`Đăng nhập thành công. Quyền: ${data.role}`);
      // TODO: Điều hướng theo role (vd: /student, /teacher) khi có route
    } catch (err) {
      setMessage("Không thể kết nối máy chủ. Hãy đảm bảo backend đang chạy ở cổng 8080.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="login-card w-[360px] sm:w-[420px] px-8 py-8 border border-black/20 rounded-[28px] relative">
        {/* logo + title */}
        <div className="flex flex-col items-center gap-2">
          <Image src="/logo-hat.svg" alt="Logo" width={36} height={36} />
          <h1 className="text-3xl font-extrabold tracking-tight">Login</h1>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            className="input-soft rounded-xl h-11 w-full px-4 text-[15px] text-black/80 outline-none"
            placeholder="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            autoComplete="username"
          />
          <input
            className="input-soft rounded-xl h-11 w-full px-4 text-[15px] text-black/80 outline-none"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <div className="text-right text-sm text-muted cursor-pointer select-none">Forgot password</div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-2 w-full h-11 rounded-full text-white font-semibold disabled:opacity-60"
          >
            {loading ? "Đang đăng nhập..." : "Login"}
          </button>
        </form>

        {message && (
          <div className="mt-3 text-sm text-center text-black/80">{message}</div>
        )}

        {/* divider */}
        <div className="mt-4 text-center text-sm text-black/70">Or</div>

        {/* Google button */}
        <button className="mt-3 w-full h-11 rounded-full bg-black/5 flex items-center justify-center gap-3 text-black/60">
          <Image src="/google.svg" alt="Google" width={20} height={20} />
          <span>Sign in with google</span>
        </button>
      </div>
    </div>
  );
}
