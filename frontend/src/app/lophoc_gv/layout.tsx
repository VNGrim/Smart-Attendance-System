import "./global.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Lớp học giảng viên",
  description: "Quản lý lớp học cho giảng viên - Smart Attendance System",
};

export default function LopHocGVLayout({
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
