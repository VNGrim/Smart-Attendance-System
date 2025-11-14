import "./global.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export const metadata = {
  title: "Cấu hình hệ thống",
  description: "Trang cấu hình hệ thống - Smart Attendance System",
};

export default function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={`role-admin`}>{children}</body>
    </html>
  );
}
