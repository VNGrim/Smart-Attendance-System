import "./global.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Thông báo Giảng viên",
  description: "Thông báo cho giảng viên - Smart Attendance System",
};

export default function LecturerNotificationsLayout({
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

