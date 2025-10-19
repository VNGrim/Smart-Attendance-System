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
  return (
    <div>
      {/* ===== Header Top ===== */}
      <div className="user-qr">
        <div className="user">
          <img src="/teacher.png" alt="avatar" />
          <div className="name">Trần Thị Giao (MAS291)</div>
        </div>
      </div>

      {/* ===== Header Bottom (Tabs) ===== */}
      <div className="header-bottom sas-header-bg" style={{ justifyContent: "center", gap: 0 }}>
        <div className="sas-tabs">
          <Link href="/lichgiangday_gv" className="sas-tab">
            <i className="fas fa-calendar"></i>
            <span>Lịch giảng dạy</span>
          </Link>
          <div className="sas-tab active">
            <i className="fas fa-users"></i>
            <span>Lớp học</span>
          </div>
        </div>
      </div>

      {/* ===== Danh sách lớp ===== */}
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
    </div>
  );
}
