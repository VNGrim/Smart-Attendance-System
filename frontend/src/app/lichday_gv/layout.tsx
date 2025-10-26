import "./global.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Lịch giảng dạy",
  description: "Lịch dạy giảng viên - Smart Attendance System",
};

export default function LecturerScheduleLayout({
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
