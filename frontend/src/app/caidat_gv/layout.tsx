import "./global.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Cài đặt giảng viên",
  description: "Tùy chỉnh thông tin và tuỳ chọn cá nhân - Smart Attendance System",
};

export default function LecturerSettingsLayout({
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
