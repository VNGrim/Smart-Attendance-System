"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  
  const handleClick = (role: string) => {
    // Điều hướng đến trang login frontend
    router.push("/login");
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center relative overflow-hidden role-student">
      {/* Logo góc trái */}
      <div className="absolute top-8 left-10">
        <Image src="/logo.png" alt="Logo" width={240} height={110} priority />
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
        <Image src="/logohome.png" alt="Logo" width={420} height={320} priority />
        <h1 className="mt-6 font-semibold" style={{ color: '#49998A', fontSize: '28px' }}>
          Trang điểm danh dành cho sinh viên và giảng viên
        </h1>
        <p className="mt-2 text-[#4A4A4A]" style={{ fontSize: '16px' }}>
          Quản lý lớp học, lịch và điểm danh nhanh chóng bằng QR
        </p>

        <div className="mt-10">
          <button
            onClick={() => handleClick("login")}
            className="px-8 py-4 text-white rounded-lg font-semibold transition text-xl"
            style={{ backgroundColor: '#49998A' }}
          >
            Đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}
