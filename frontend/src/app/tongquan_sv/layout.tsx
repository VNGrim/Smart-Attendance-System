import "./global.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Tổng quan sinh viên",
  description: "Tổng quan hoạt động học tập - Smart Attendance System",
};

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={`${inter.className} role-student`}>{children}</body>
    </html>
  );
}

