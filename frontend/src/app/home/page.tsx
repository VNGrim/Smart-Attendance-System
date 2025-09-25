"use client";

import Image from "next/image";

export default function Home() {
  const handleClick = (path: string) => {
    window.location.href = `http://localhost:8080/${path}`;
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ backgroundColor: "#eff4cb" }}
    >
      {/* Logo */}
      <div className="mt-[10%]">
        <Image
          src="/logo.png"
          alt="Logo"
          width={450}
          height={350}
          priority
        />
      </div>

      {/* Nút */}
      <div className="flex gap-16 mt-auto mb-[25vh]">
        <button
          onClick={() => handleClick("login")}
          className="px-8 py-4 bg-[#479a8a] text-white rounded-lg font-semibold hover:bg-[#36796e] transition text-2xl"
        >
          Sinh viên
        </button>
        <button
          onClick={() => handleClick("login-teacher")}
          className="px-8 py-4 bg-[#479a8a] text-white rounded-lg font-semibold hover:bg-[#36796e] transition text-2xl"
        >
          Giáo viên
        </button>
      </div>
    </div>
  );
}
