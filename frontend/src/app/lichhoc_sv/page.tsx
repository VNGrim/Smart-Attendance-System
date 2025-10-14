"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import QRButton from "@/app/components/QRButton";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_IDS = [1, 2, 3, 4];

export default function LichHocPage() {
  const [year, setYear] = useState("2025");
  const [week, setWeek] = useState("29/09 - 05/10");
  const [student, setStudent] = useState<{ student_id: string; full_name: string; course: string } | null>(null);
  const [grid, setGrid] = useState<Record<number, Record<string, any>>>({});
  const [flat, setFlat] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Đọc studentId từ localStorage nếu có
  const studentId = (() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem("sas_user");
      if (!raw) return "";
      const u = JSON.parse(raw);
      if (u?.role === "student" && typeof u?.userId === "string") return u.userId;
      return "";
    } catch {
      return "";
    }
  })();

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        setLoading(true);
        setError("");
        const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
        const [infoRes, scheduleRes] = await Promise.all([
          fetch(`${base}/api/lichhoc/students/${studentId}`),
          fetch(`${base}/api/lichhoc/schedule/${studentId}`),
        ]);

        if (!infoRes.ok) throw new Error("Không lấy được thông tin sinh viên");
        if (!scheduleRes.ok) throw new Error("Không lấy được thời khóa biểu");

        const infoJson = await infoRes.json();
        const scheduleJson = await scheduleRes.json();

        if (isMounted) {
          setStudent(infoJson.data);
          setGrid(scheduleJson.data.grid || {});
          setFlat(scheduleJson.data.flat || []);
        }
      } catch (e: any) {
        if (isMounted) setError(e.message || "Lỗi tải dữ liệu");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (studentId) fetchData();
    return () => { isMounted = false; };
  }, [studentId]);

  const slotTimeById = useMemo(() => {
    const map: Record<number, { start: string; end: string }> = {};
    for (const r of flat) {
      if (r.slot_id && !map[r.slot_id]) {
        map[r.slot_id] = { start: r.start_time?.slice(0,5) || "", end: r.end_time?.slice(0,5) || "" };
      }
    }
    return map;
  }, [flat]);

  return (
    <div>
      {/* ===== Header Top (avatar + QR) ===== */}
      <div className="user-qr">
        <div className="user">
          <img src="/avatar.png" alt="avatar" />
          <div className="name">{student?.full_name || "Sinh viên"}</div>
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
        <Link href="/lichsu_sv" className="tab">
          <i className="fas fa-history"></i>
          <span>Lịch sử</span>
        </Link>
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
        {loading ? (
          <div>Đang tải thời khóa biểu...</div>
        ) : error ? (
          <div style={{ color: "red" }}>{error}</div>
        ) : (
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
            {SLOT_IDS.map((slotId) => (
              <tr key={slotId}>
                <td>
                  <b>Slot {slotId}</b>
                  {slotTimeById[slotId] && (
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {slotTimeById[slotId].start} - {slotTimeById[slotId].end}
                    </div>
                  )}
                </td>
                {DAYS.map((day) => {
                  const cell = grid?.[slotId]?.[day] || null;
                  if (!cell) return <td key={`${day}-${slotId}`}></td>;
                  return (
                    <td key={`${day}-${slotId}`}>
                      <div
                        style={{
                          backgroundColor: cell.color || "#e2e8f0",
                          color: "#fff",
                          borderRadius: 8,
                          padding: 8,
                          lineHeight: 1.2,
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{cell.className}</div>
                        <div style={{ fontSize: 12 }}>
                          {cell.startTime?.slice(0,5)} - {cell.endTime?.slice(0,5)}
                        </div>
                        <div style={{ fontSize: 12 }}>{cell.teacherName}</div>
                        {cell.room ? (
                          <div style={{ fontSize: 12 }}>Phòng {cell.room}</div>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}
