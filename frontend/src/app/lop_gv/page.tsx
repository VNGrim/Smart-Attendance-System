"use client";

import Link from "next/link";

const classes = [
  { name: "SE18A", students: 17 },
  { name: "SE19C", students: 19 },
  { name: "QE18B", students: 19 },
  { name: "SE18C", students: 20 },
];

const colors = ["#F9A8D4", "#A7F3D0", "#BFDBFE", "#FDE68A", "#C7D2FE", "#FDBA74"];

export default function LopGVPage() {
  const teacherInfo = { full_name: 'Giảng viên', teacher_id: 'MAS291' };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="layout">
      <aside className="sidebar">
        <div className="side-header">
          <div className="side-name">
            Chào mừng,<br />
            {teacherInfo.full_name}
          </div>
        </div>
        <nav className="side-nav">
          <Link href="/thongbao_gv" className="side-link">🔔 Thông báo</Link>
          <Link href="/lichgiangday_gv" className="side-link">📅 Lịch giảng dạy</Link>
          <div className="side-link active">👥 Lớp học</div>
          <Link href="/caidat_gv" className="side-link">⚙️ Cài đặt</Link>
        </nav>
      </aside>
      <header className="topbar">
        <div className="side-header" style={{ padding: 0 }}>
          <strong style={{ color: "white" }}>Lớp học</strong>
        </div>
        <div className="controls"></div>
      </header>
      <main className="main">{children}</main>
    </div>
  );

  return (
    <Shell>
      <div style={{ width: "1137px", margin: "40px auto" }}>
        {classes.map((cls, idx) => {
          const bgColor = colors[idx % colors.length];
          return (
            <div
              key={cls.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#fff",
                padding: "16px 24px",
                borderRadius: "12px",
                marginBottom: "16px",
                fontWeight: 600,
                color: "#333",
                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                border: `2px solid ${bgColor}`,
              }}
            >
              <div>
                {cls.name} &nbsp; <span style={{ color: "#555" }}>({cls.students} sinh viên)</span>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  style={{
                    background: "#49998A",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 14px",
                    cursor: "pointer",
                  }}
                >
                  View
                </button>
                <button
                  style={{
                    background: "#FFD700",
                    color: "#000",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 14px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
