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
    <div
      className="h-screen w-screen flex flex-col items-center relative overflow-hidden"
      style={{ backgroundColor: "#eff4cb" }}
    > 
      {/* Logo chính giữa */}
      
      <div className="mt-[10%]">
        <Image
          src="/logohome.png"
          alt="Logo"
          width={450}
          height={350}
          priority
        />
      </div>
      {/* Logo ở góc trên bên trái */}
      <div className="absolute top-20 left-35">
        <Image
          src="/logo.png"
          alt="Logo"
          width={300}
          height={140}
          priority
        />
      </div>

      {/* Tiêu đề phụ */}
      <div
        className="absolute top-30 font-semibold text-lg"
        style={{ color: '#49998A', fontSize: '30px' }}
      >
        Trang điểm danh dành cho sinh viên và giảng viên
      </div>


      {/* Nút */}
      <div className="flex gap-16 mt-auto mb-[25vh]">
        <button
          onClick={() => handleClick("login")}
          className="px-8 py-4 bg-[#479a8a] text-white rounded-lg font-semibold hover:bg-[#36796e] transition text-2xl"
        >
          Đăng nhập
        </button>
      </div>
    </div>
  );
}
