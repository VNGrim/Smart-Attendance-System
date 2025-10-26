import "./global.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Điểm danh giảng viên",
  description: "Tạo buổi điểm danh và theo dõi tham dự - Smart Attendance System",
};

export default function LecturerAttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={`${inter.className} role-lecturer`}>{children}</body>
    </html>
  );
}

