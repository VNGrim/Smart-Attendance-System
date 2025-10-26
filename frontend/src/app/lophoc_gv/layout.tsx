import "./global.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Lịch học sinh viên",
  description: "Trang lịch học của hệ thống điểm danh",
};

export default function LichHocLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={`${inter.className} role-teacher`}>{children}</body>
    </html>
  );
}
