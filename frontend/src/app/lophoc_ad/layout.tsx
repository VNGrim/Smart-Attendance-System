import "./global.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export const metadata = {
  title: "Quản lý Lớp học",
  description: "Trang quản trị lớp học - Smart Attendance System",
};

export default function AdminClassesLayout({
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

