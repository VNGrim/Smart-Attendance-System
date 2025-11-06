"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import QRButton from "@/app/components/QRButton";
import { format, startOfWeek, endOfWeek, addWeeks, eachWeekOfInterval } from "date-fns";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_IDS = [1, 2, 3, 4];
const WEEK_START_OPTS = { weekStartsOn: 1 as const };

// Tạo week_key theo format YYYY-Www
const weekKeyFromDate = (date: Date) => format(startOfWeek(date, WEEK_START_OPTS), "RRRR-'W'II");

// Tạo label hiển thị tuần theo format dd/MM - dd/MM
const weekLabelFromDate = (date: Date) => {
  const start = startOfWeek(date, WEEK_START_OPTS);
  const end = endOfWeek(start, WEEK_START_OPTS);
  return `${format(start, "dd/MM")} - ${format(end, "dd/MM")}`;
};

type WeekOption = {
  value: string; // week_key: "2025-W45"
  label: string; // "3/11 - 9/11"
};

// Tạo danh sách tuần cho 1 năm
const generateWeekOptions = (year: number): WeekOption[] => {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const weeks = eachWeekOfInterval({ start: yearStart, end: yearEnd }, WEEK_START_OPTS);
  
  return weeks.map((weekStart) => ({
    value: weekKeyFromDate(weekStart),
    label: weekLabelFromDate(weekStart),
  }));
};

export default function LichHocPage() {
  const [collapsed, setCollapsed] = useState(false);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedWeekKey, setSelectedWeekKey] = useState(() => weekKeyFromDate(new Date()));
  
  const [student, setStudent] = useState<{ student_id: string; full_name: string; course: string } | null>(null);
  const [grid, setGrid] = useState<Record<number, Record<string, any>>>({});
  const [flat, setFlat] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [themeDark, setThemeDark] = useState(true);
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

  // Tạo danh sách năm: 3 năm gần nhất
  const yearOptions = useMemo(() => {
    return [currentYear - 1, currentYear, currentYear + 1];
  }, [currentYear]);

  // Tạo danh sách tuần cho năm được chọn
  const weekOptions = useMemo(() => {
    return generateWeekOptions(selectedYear);
  }, [selectedYear]);

  // Fetch dữ liệu khi studentId hoặc selectedWeekKey thay đổi
  const fetchData = useCallback(async () => {
    if (!studentId) return;
    
    try {
      setLoading(true);
      setError("");
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
      const [infoRes, scheduleRes] = await Promise.all([
        fetch(`${base}/api/lichhoc/students/${studentId}`),
        fetch(`${base}/api/lichhoc/schedule/${studentId}?week=${selectedWeekKey}`),
      ]);

      if (!infoRes.ok) throw new Error("Không lấy được thông tin sinh viên");
      if (!scheduleRes.ok) throw new Error("Không lấy được thời khóa biểu");

      const infoJson = await infoRes.json();
      const scheduleJson = await scheduleRes.json();

      setStudent(infoJson.data);
      setGrid(scheduleJson.data.grid || {});
      setFlat(scheduleJson.data.flat || []);
    } catch (e: any) {
      setError(e.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [studentId, selectedWeekKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Áp dụng theme từ localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sas_settings');
      if (saved) {
        const s = JSON.parse(saved);
        setThemeDark(s.themeDark ?? true);
        document.documentElement.classList.toggle('dark-theme', s.themeDark);
        document.documentElement.classList.toggle('light-theme', !s.themeDark);
      }
    } catch {}

    const handler = (e: any) => {
      const s = e.detail;
      if (!s) return;
      setThemeDark(s.themeDark);
      document.documentElement.classList.toggle('dark-theme', s.themeDark);
      document.documentElement.classList.toggle('light-theme', !s.themeDark);
    };
    window.addEventListener('sas_settings_changed', handler);

    return () => window.removeEventListener('sas_settings_changed', handler);
  }, []);

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

  const getAttendanceStatusText = (cell?: { attendanceStatus?: string; status?: string }) => {
    const raw = (cell?.attendanceStatus ?? cell?.status ?? '').toString().trim().toLowerCase();

    switch (raw) {
      case 'present':
      case 'attended':
        return '✅ Đã điểm danh';
      case 'absent':
        return '❌ Vắng mặt';
      case 'excused':
        return '📝 Có phép';
      case 'ongoing':
        return '🟢 Đang diễn ra';
      case 'upcoming':
        return '⏳ Sắp diễn ra';
      default:
        return '⏳ Chưa điểm danh';
    }
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
      <main className={`main ${themeDark ? 'dark-theme' : 'light-theme'}`}>
  {children}
</main>
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
          <select className="select" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select className="select" value={selectedWeekKey} onChange={(e) => setSelectedWeekKey(e.target.value)}>
            {weekOptions.map(w => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
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
            <React.Fragment key={slotId}>
              <div className="row-header">
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
                          {cell.classId && <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>{cell.classId}</div>}
                          <div className="class-time" style={{ fontSize: 12 }}>{cell.startTime?.slice(0,5)} - {cell.endTime?.slice(0,5)}</div>
                          <div className="class-lecturer" style={{ fontSize: 12 }}>{cell.teacherName}</div>
                          {cell.room && <div className="class-room" style={{ fontSize: 12 }}>Phòng {cell.room}</div>}
                        </div>
                        <div className="pop">
                          <h4>{cell.subjectName || cell.className}</h4>
                          {cell.classId && <p><strong>Lớp:</strong> {cell.classId}</p>}
                          <p><strong>Thời gian:</strong> {cell.startTime?.slice(0,5)} - {cell.endTime?.slice(0,5)}</p>
                          <p><strong>Giảng viên:</strong> {cell.teacherName}</p>
                          <p><strong>Trạng thái điểm danh:</strong> {getAttendanceStatusText(cell)}</p>
                          {cell.room && <p><strong>Phòng:</strong> {cell.room}</p>}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </Shell>
  );
}
