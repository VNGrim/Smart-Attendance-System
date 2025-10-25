import "./global.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Tổng quan hệ thống",
  description: "Bảng điều khiển admin - Smart Attendance System",
};

export default function AdminOverviewLayout({
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

