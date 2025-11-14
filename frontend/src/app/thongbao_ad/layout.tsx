import "./global.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export const metadata = {
  title: "Thông báo - Quản trị",
  description: "Quản lý thông báo hệ thống - Smart Attendance System",
};

export default function AdminNotifyLayout({
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

