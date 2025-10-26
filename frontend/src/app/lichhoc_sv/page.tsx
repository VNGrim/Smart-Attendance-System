"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import QRButton from "@/app/components/QRButton";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_IDS = [1, 2, 3, 4];

export default function LichHocPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [year, setYear] = useState("2025");
  const [week, setWeek] = useState("29/09 - 05/10");
  const [student, setStudent] = useState<{ student_id: string; full_name: string; course: string } | null>(null);
  const [grid, setGrid] = useState<Record<number, Record<string, any>>>({});
  const [flat, setFlat] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

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
    // Apply settings theme from localStorage and subscribe changes
    try {
      const saved = localStorage.getItem('sas_settings');
      if (saved) {
        const s = JSON.parse(saved);
        document.documentElement.style.colorScheme = s.themeDark ? 'dark' : 'light';
      }
    } catch {}
    const handler = (e: any) => {
      const s = e?.detail;
      if (!s) return;
      document.documentElement.style.colorScheme = s.themeDark ? 'dark' : 'light';
    };
    window.addEventListener('sas_settings_changed' as any, handler);
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

  const getSubjectColor = (className: string) => {
    const colors = ['card-blue', 'card-teal', 'card-purple', 'card-green', 'card-orange', 'card-pink', 'card-indigo', 'card-red'];
    const hash = className.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getSubjectIcon = (className: string) => {
    if (className.includes('Web') || className.includes('WEB')) return '🌐';
    if (className.includes('Database') || className.includes('DB')) return '🗄️';
    if (className.includes('Algorithm') || className.includes('ALG')) return '🧮';
    if (className.includes('Network') || className.includes('NET')) return '🌐';
    if (className.includes('AI') || className.includes('Machine')) return '🤖';
    if (className.includes('Mobile') || className.includes('APP')) return '📱';
    if (className.includes('Game') || className.includes('GAME')) return '🎮';
    if (className.includes('Security') || className.includes('SEC')) return '🔒';
    return '📚';
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="side-header">
          <button className="collapse-btn" onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
            {collapsed ? '⮞' : '⮜'}
          </button>
          <div className="side-name">
            Chào mừng,<br />
            {student?.full_name || "Sinh viên"}
          </div>
        </div>
        <nav className="side-nav">
          <Link href="/tongquan_sv" className="side-link">🏠 {!collapsed && "Trang tổng quan"}</Link>
          <Link href="/thongbao_sv" className="side-link">🔔 {!collapsed && "Thông báo"}</Link>
          <div className="side-link active">📅 {!collapsed && "Lịch học"}</div>
          <Link href="/lichsu_sv" className="side-link">🕘 {!collapsed && "Lịch sử"}</Link>
          <Link href="/caidat_sv" className="side-link">⚙️ {!collapsed && "Cài đặt"}</Link>
        </nav>
      </aside>
      <header className="topbar">
        <div className="welcome">
          <div className="hello">Xin chào, {student?.full_name || "Sinh viên"} 👋</div>
          <div className="date">Hôm nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
        </div>
        <div className="controls">
          <button className="qr-btn">📷 Quét QR</button>
          <button className="qr-btn" onClick={() => { 
            if (confirm('Bạn có chắc muốn đăng xuất?')) {
              localStorage.removeItem('sas_user'); 
              window.location.href = '/login'; 
            }
          }}>🚪 Đăng xuất</button>
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );

  if (loading) {
    return (
      <Shell>
        <div className="schedule-shell">
          <div>Đang tải thời khóa biểu...</div>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="schedule-shell" style={{ color: "red" }}>{error}</div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="schedule-shell">
        {/* Lọc tuần/năm */}
        <div className="filters" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
          <select className="select" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
          <select className="select" value={week} onChange={(e) => setWeek(e.target.value)}>
            <option value="29/09 - 05/10">29/09 - 05/10</option>
            <option value="06/10 - 12/10">06/10 - 12/10</option>
            <option value="13/10 - 19/10">13/10 - 19/10</option>
          </select>
        </div>
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
            <>
              <div key={`slot-${slotId}`} className="row-header">
                <div className="slot-badge">Slot {slotId}</div>
                {slotTimeById[slotId] && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {slotTimeById[slotId].start} - {slotTimeById[slotId].end}
                  </div>
                )}
              </div>
              {DAYS.map((day) => {
                const cell = grid?.[slotId]?.[day] || null;
                return (
                  <div key={`${day}-${slotId}`} className="cell">
                    {cell ? (
                      <>
                        <div className={`class-card ${getSubjectColor(cell.className)}`}>
                          <div style={{ fontSize: 16 }}>{getSubjectIcon(cell.className)}</div>
                          <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.15, textShadow: '0 1px 0 rgba(0,0,0,0.15)' }}>{cell.className}</div>
                          <div className="class-time" style={{ fontSize: 12 }}>{cell.startTime?.slice(0,5)} - {cell.endTime?.slice(0,5)}</div>
                          <div className="class-lecturer" style={{ fontSize: 12 }}>{cell.teacherName}</div>
                          {cell.room && <div className="class-room" style={{ fontSize: 12 }}>Phòng {cell.room}</div>}
                        </div>
                        <div className="pop">
                          <h4>{cell.className}</h4>
                          <p><strong>Thời gian:</strong> {cell.startTime?.slice(0,5)} - {cell.endTime?.slice(0,5)}</p>
                          <p><strong>Giảng viên:</strong> {cell.teacherName}</p>
                          {cell.room && <p><strong>Phòng:</strong> {cell.room}</p>}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </Shell>
  );
}
