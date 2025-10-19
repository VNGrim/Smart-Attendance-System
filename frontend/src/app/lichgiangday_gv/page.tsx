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

  return (
    <div>
      {/* ===== Header Top ===== */}
      <div className="user-qr">
        <div className="user">
          <img src="/teacher.png" alt="avatar" />
          <div className="name">{teacherInfo.full_name || teacherInfo.name || "Giảng viên"} ({teacherInfo.teacher_id || teacherInfo.userId || "N/A"})</div>
        </div>
      </div>

      {/* ===== Header Bottom (Tabs) ===== */}
      <div className="header-bottom sas-header-bg" style={{ justifyContent: "center", gap: 0 }}>
        <div className="sas-tabs">
          <div className="sas-tab active">
          <i className="fas fa-calendar"></i>
          <span>Lịch giảng dạy</span>
          </div>
          <Link href="/lop_gv" className="sas-tab">
            <i className="fas fa-users"></i>
            <span>Lớp học</span>
          </Link>
        </div>
      </div>

      {/* ===== Năm + Tuần dropdown ===== */}
      <div className="schedule-header">
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
        <select value={week} onChange={(e) => setWeek(e.target.value)}>
          <option value="06/10 - 12/10">06/10 - 12/10</option>
          <option value="13/10 - 19/10">13/10 - 19/10</option>
          <option value="20/10 - 26/10">20/10 - 26/10</option>
        </select>
      </div>

      {/* ===== Bảng lịch giảng dạy ===== */}
      <div className="schedule-card" style={{ width: "1137px", margin: "30px auto" }}>
        <table className="schedule-table" style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.06)", borderRadius: 12, overflow: "hidden" }}>
          <thead>
            <tr>
              <th>Slot</th>
              {DAYS.map((d) => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOT_IDS.map((slotId) => (
              <tr key={slotId}>
                <td>
                  <b>Slot {slotId}</b>
                </td>
                {DAYS.map((day) => (
                  <td key={`${day}-${slotId}`}></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ textAlign: "center", marginTop: 20, color: "#666" }}>
          Chưa có lịch giảng dạy.
        </div>
      </div>
    </div>
  );
}
