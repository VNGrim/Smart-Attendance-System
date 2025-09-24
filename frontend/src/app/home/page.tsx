import Image from "next/image";

export default function Home() {
  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ backgroundColor: "#eff4cb" }}
    >
      {/* Logo */}
      <div className="mt-[10%] transform scale-150">
        <Image
          src="/logo.png"
          alt="Logo"
          width={450}
          height={350}
          priority
        />
      </div>

      {/* Nút */}
      <div className="flex gap-16 mt-4">
        <button className="px-8 py-4 bg-[#479a8a] text-white rounded-lg font-semibold hover:bg-[#36796e] transition text-lg">
          Sinh viên
        </button>
        <button className="px-8 py-4 bg-[#479a8a] text-white rounded-lg font-semibold hover:bg-[#36796e] transition text-lg">
          Giáo viên
        </button>
      </div>
    </div>
  );
}