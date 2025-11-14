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
    <>
      <div className="min-h-screen w-screen flex flex-col items-center relative overflow-hidden">
        {/* Background image (covers full screen) */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/home-bg.jpg"
            alt="Home background"
            fill
            style={{ objectFit: "cover" }}
            priority
          />
          <div className="absolute inset-0 bg-black/60" />
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

        {/* Center card (hero section) */}
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
        <div className="w-full bg-black text-white py-3 px-6 flex justify-center items-center text-sm md:text-base">
          <div className="max-w-4xl text-center">
            Đại học FPT Quy Nhơn - Địa chỉ: Khu đô thị An Phú Thịnh, Phường Quy Nhơn Nam, Tỉnh Gia Lai.
          </div>
        </div>
      </div>

      {/* Info section chi tiết, nằm dưới cùng, trên cùng background */}
      <div className="w-full text-white py-16 px-4 flex flex-col items-center border-t border-white/10" style={{background: "linear-gradient(135deg, #6a82fb 0%, #a1c4fd 100%)"}}>
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 px-0 md:px-8 lg:px-16 xl:px-32">
          {/* Về ứng dụng */}
          <div className="rounded-xl p-6 shadow-lg text-white" style={{background: "linear-gradient(135deg, #232526 0%, #2e8b7a 100%)"}}>
            <h2 className="text-xl font-bold mb-2">Về ứng dụng</h2>
            <ul className="list-disc pl-4 text-base">
              <li>Giúp tự động hóa quá trình điểm danh bằng mã QR và mã điểm danh</li>
              <li>Tiết kiệm thời gian điểm danh, dễ dàng cho học tập và quản lý</li>
              <li>Ứng dụng phù hợp với môi trường hiện đại</li>
            </ul>
          </div>
          {/* Tính năng nổi bật */}
          <div className="rounded-xl p-6 shadow-lg text-white" style={{background: "linear-gradient(135deg, #232526 0%, #2e8b7a 100%)"}}>
            <h2 className="text-xl font-bold mb-2">Tính năng nổi bật</h2>
            <ul className="list-disc pl-4 text-base">
              <li>Điểm danh QR: quét mã QR để ghi nhận điểm danh nhanh chóng.</li>
              <li>Thống kê buổi học: Theo dõi tỉ lệ điểm danh của từng lớp.</li>
              <li>Thông báo tự động: nhận thông báo khi có buổi học hoặc thay đổi.</li>
            </ul>
          </div>
        </div>
        {/* Nhóm phát triển nằm ngang dưới 2 card */}
        <div className="max-w-4xl mx-auto w-full flex flex-col items-center mt-8">
          <h2 className="text-xl font-bold mb-3 text-gray-900">Nhóm phát triển</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 w-full justify-items-center max-w-[900px] mx-auto">
            <div className="flex flex-col items-center">
              <Image src="/avatar.png" alt="Gia Huy" width={60} height={60} className="rounded-full border-2 border-[#2e8b7a]" />
              <div className="flex flex-row items-center gap-2 mt-2">
                <span className="text-base font-semibold text-gray-900">Gia Huy</span>
                <span className="text-xs text-gray-700">Frontend & UI</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <Image src="/avatar.png" alt="Đinh Văn" width={60} height={60} className="rounded-full border-2 border-[#2e8b7a]" />
              <div className="flex flex-row items-center gap-2 mt-2">
                <span className="text-base font-semibold text-gray-900">Đinh Văn</span>
                <span className="text-xs text-gray-700">Backend Developer</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <Image src="/avatar.png" alt="Lê Trung" width={60} height={60} className="rounded-full border-2 border-[#2e8b7a]" />
              <div className="flex flex-row items-center gap-2 mt-2">
                <span className="text-base font-semibold text-gray-900">Lê Trung</span>
                <span className="text-xs text-gray-700">Backend Developer</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <Image src="/avatar.png" alt="Thùy Trang" width={60} height={60} className="rounded-full border-2 border-[#2e8b7a]" />
              <div className="flex flex-row items-center gap-2 mt-2">
                <span className="text-base font-semibold text-gray-900">Thùy Trang</span>
                <span className="text-xs text-gray-700">Project Manager</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
