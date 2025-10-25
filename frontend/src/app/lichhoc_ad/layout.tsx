import "./global.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Quản lý Lịch học",
  description: "Trang quản trị lịch học - Smart Attendance System",
};

export default function AdminScheduleLayout({
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

