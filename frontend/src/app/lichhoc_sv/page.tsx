"use client";

import Link from "next/link";
import { useState } from "react";
import QRButton from "@/app/components/QRButton";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS = Array.from({ length: 8 }, (_, i) => `Slot ${i + 1}`);

export default function LichHocPage() {
  const [year, setYear] = useState("2025");
  const [week, setWeek] = useState("29/09 - 05/10");

  return (
    <div>
      {/* ===== Header Top (avatar + QR) ===== */}
      <div className="user-qr">
        <div className="user">
          <img src="/avatar.png" alt="avatar" />
          <div className="name">Nguyen Van A</div>
        </div>
        <QRButton />
      </div>

      {/* ===== Header Bottom (thanh tab xanh) ===== */}
      <div className="header-bottom">
        <Link href="/thongbao_sv" className="tab">
          <i className="fas fa-bell"></i>
          <span>Thông báo</span>
        </Link>
        <div className="tab active">
          <i className="fas fa-calendar"></i>
          <span>Lịch học</span>
        </div>
        <div className="tab">
          <i className="fas fa-history"></i>
          <span>Lịch sử</span>
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
          <option value="29/09 - 05/10">29/09 - 05/10</option>
          <option value="06/10 - 12/10">06/10 - 12/10</option>
          <option value="13/10 - 19/10">13/10 - 19/10</option>
        </select>
      </div>

      {/* ===== Bảng lịch ===== */}
      <div className="schedule-card">
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Slot</th>
              {DAYS.map((d) => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((slot, idx) => (
              <tr key={idx}>
                <td>
                  <b>{slot}</b>
                </td>
                {DAYS.map((d) => (
                  <td key={d + idx}></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
