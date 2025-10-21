"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_IDS = [1, 2, 3, 4];

export default function LichGiangDayGVPage() {
  const [year, setYear] = useState("2025");
  const [week, setWeek] = useState("13/10 - 19/10");
  const [teacherInfo, setTeacherInfo] = useState({ 
    userId: "", 
    name: "", 
    teacher_id: "", 
    full_name: "" 
  });

  // Lấy thông tin giáo viên từ localStorage
  useEffect(() => {
    try {
      const userData = localStorage.getItem("sas_user");
      if (userData) {
        const user = JSON.parse(userData);
        if (user.role === "teacher") {
          setTeacherInfo({
            userId: user.userId,
            name: user.name,
            teacher_id: user.teacher_id,
            full_name: user.full_name
          });
        }
      }
    } catch (error) {
      console.error("Error loading teacher info:", error);
    }
  }, []);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="layout">
      <aside className="sidebar">
        <div className="side-header">
          <div className="side-name">
            Chào mừng,<br />
            {teacherInfo?.full_name || teacherInfo?.name || "Giảng viên"}
          </div>
        </div>
        <nav className="side-nav">
          <Link href="/thongbao_gv" className="side-link">🔔 Thông báo</Link>
          <div className="side-link active">📅 Lịch giảng dạy</div>
          <Link href="/lop_gv" className="side-link">👥 Lớp học</Link>
          <Link href="/caidat_gv" className="side-link">⚙️ Cài đặt</Link>
        </nav>
      </aside>
      <header className="topbar">
        <div className="side-header" style={{ padding: 0 }}>
          <strong style={{ color: "white" }}>Lịch giảng dạy</strong>
        </div>
        <div className="controls">
          <select className="select" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
          <select className="select" value={week} onChange={(e) => setWeek(e.target.value)}>
            <option value="06/10 - 12/10">06/10 - 12/10</option>
            <option value="13/10 - 19/10">13/10 - 19/10</option>
            <option value="20/10 - 26/10">20/10 - 26/10</option>
          </select>
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );

  return (
    <Shell>
      <div className="schedule-card">
        {/* Headers */}
        <div className="grid" style={{ marginBottom: 6 }}>
          <div></div>
          {DAYS.map((d) => (
            <div key={d} className="col-header">{d}</div>
          ))}
        </div>
        {/* Grid */}
        <div className="grid">
          {SLOT_IDS.map((slotId) => (
            <div key={`slot-group-${slotId}`}>
              <div className="row-header">
                <div className="slot-badge">Slot {slotId}</div>
              </div>
              {DAYS.map((day) => (
                <div key={`${day}-${slotId}`} className="cell"></div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 20, color: "#666" }}>
          Chưa có lịch giảng dạy.
        </div>
      </div>
    </Shell>
  );
}
