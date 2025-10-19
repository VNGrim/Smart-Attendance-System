import "./global.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Lịch sử điểm danh sinh viên",
  description: "Trang lịch sử điểm danh của hệ thống điểm danh",
};

export default function LichSuLayout({
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
