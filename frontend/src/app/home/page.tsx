"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleClick = (_role?: string) => {
    // All roles use the same login route now
    router.push("/login");
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center relative overflow-hidden">
      {/* Background image (covers full screen) */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/home-bg.jpg"
          alt="Home background"
          fill
          style={{ objectFit: "cover" }}
          priority
        />
        {/* Subtle overlay to make content readable */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Top-left small logo */}
      <div className="absolute top-6 left-6">
        <Image src="/logo.png" alt="Logo" width={160} height={70} priority />
      </div>

      {/* Scrolling subtitle (marquee) */}
      <div className="absolute top-6 left-0 right-0 flex justify-center">
        <div className="marquee-container px-4 py-2 rounded-md" aria-hidden>
          <div className="marquee">
            <span className="marquee-text">Welcome sinh viên và giảng viên</span>
          </div>
        </div>
      </div>

      {/* Center card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white/6 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-12 max-w-3xl w-full text-center shadow-lg">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Trang điểm danh dành cho sinh viên và giảng viên
          </h1>

          <p className="text-sm text-white/90 mb-6">
            Hệ thống điểm danh thông minh
          </p>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => handleClick("login")}
              className="px-10 py-3 bg-[#2e8b7a] text-white rounded-lg font-semibold hover:bg-[#256b5d] transition text-lg"
              aria-label="Đăng nhập"
            >
              Đăng nhập
            </button>
          </div>
        </div>
      </div>

      {/* Bottom black address strip */}
      <div className="absolute left-0 right-0 bottom-0">
        <div className="w-full bg-black text-white py-3 px-6 flex justify-center items-center text-sm md:text-base">
          <div className="max-w-4xl text-center">
            Trường Đại học ABC - Địa chỉ: Số 123, Đường XYZ, Quận Q, Thành phố T
          </div>
        </div>
      </div>
    </div>
  );
}
