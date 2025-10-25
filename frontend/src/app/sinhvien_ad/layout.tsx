import "./global.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Quản lý Sinh viên",
  description: "Trang quản trị sinh viên - Smart Attendance System",
};

export default function AdminStudentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={`${inter.className} role-admin`}>{children}</body>
    </html>
  );
}

