"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, addWeeks, parse, getISOWeekYear } from "date-fns";
import { useRouter } from "next/navigation";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_IDS = [1, 2, 3, 4];
const WEEK_START_OPTS = { weekStartsOn: 1 as const };

const weekKeyFromDate = (date: Date) => format(startOfWeek(date, WEEK_START_OPTS), "RRRR-'W'II");
const weekLabelFromDate = (date: Date) => {
  const start = startOfWeek(date, WEEK_START_OPTS);
  const end = endOfWeek(start, WEEK_START_OPTS);
  return `${format(start, "dd/MM")} - ${format(end, "dd/MM")}`;
};
const dateFromWeekKey = (weekKey: string) => parse(weekKey, "RRRR-'W'II", new Date());

type WeekOption = { value: string; label: string };

export default function LecturerSchedulePage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedWeekKey, setSelectedWeekKey] = useState(() => weekKeyFromDate(new Date()));

  const [lecturer, setLecturer] = useState<{ teacher_id: string; full_name: string } | null>(null);
  const [grid, setGrid] = useState<Record<number, Record<string, any>>>({});
  const [flat, setFlat] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [themeDark, setThemeDark] = useState(true);

  const teacherId = (() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem("sas_user");
      if (!raw) return "";
      const u = JSON.parse(raw);
      if (u?.role === "teacher" && typeof u?.userId === "string") return u.userId;
      return "";
    } catch {
      return "";
    }
  })();

  const yearOptions = useMemo(() => [currentYear - 1, currentYear, currentYear + 1], [currentYear]);
  const weekOptions = useMemo<WeekOption[]>(() => {
    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear, 11, 31);
    const weeks = eachWeekOfInterval({ start: yearStart, end: yearEnd }, WEEK_START_OPTS);
    return weeks.map((ws) => ({ value: weekKeyFromDate(ws), label: weekLabelFromDate(ws) }));
  }, [selectedYear]);

  // Điều hướng tuần
  const goToPrevWeek = () => {
    const curDate = dateFromWeekKey(selectedWeekKey);
    const target = addWeeks(curDate, -1);
    setSelectedWeekKey(weekKeyFromDate(target));
    const isoYear = getISOWeekYear(target);
    if (isoYear !== selectedYear) setSelectedYear(isoYear);
  };

  const goToCurrentWeek = () => {
    const now = new Date();
    setSelectedWeekKey(weekKeyFromDate(now));
    const isoYear = getISOWeekYear(now);
    if (isoYear !== selectedYear) setSelectedYear(isoYear);
  };

  const goToNextWeek = () => {
    const curDate = dateFromWeekKey(selectedWeekKey);
    const target = addWeeks(curDate, 1);
    setSelectedWeekKey(weekKeyFromDate(target));
    const isoYear = getISOWeekYear(target);
    if (isoYear !== selectedYear) setSelectedYear(isoYear);
  };

  const fetchData = useCallback(async () => {
    if (!teacherId) return;
    try {
      setLoading(true);
      setError("");
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
      const [infoRes, scheduleRes] = await Promise.all([
        fetch(`${base}/api/lichday/teachers/${teacherId}`),
        fetch(`${base}/api/lichday/schedule/${teacherId}?week=${selectedWeekKey}`),
      ]);
      if (!infoRes.ok) throw new Error("Không lấy được thông tin giảng viên");
      if (!scheduleRes.ok) throw new Error("Không lấy được lịch giảng dạy");
      const infoJson = await infoRes.json();
      const scheduleJson = await scheduleRes.json();
      setLecturer(infoJson.data);
      setGrid(scheduleJson.data.grid || {});
      setFlat(scheduleJson.data.flat || []);
    } catch (e: any) {
      setError(e.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [teacherId, selectedWeekKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sas_settings");
      if (saved) {
        const s = JSON.parse(saved);
        setThemeDark(s.themeDark ?? true);
        document.documentElement.classList.toggle("dark-theme", s.themeDark);
        document.documentElement.classList.toggle("light-theme", !s.themeDark);
      }
    } catch {}
    const handler = (e: any) => {
      const s = e.detail;
      if (!s) return;
      setThemeDark(s.themeDark);
      document.documentElement.classList.toggle("dark-theme", s.themeDark);
      document.documentElement.classList.toggle("light-theme", !s.themeDark);
    };
    window.addEventListener("sas_settings_changed", handler);
    return () => window.removeEventListener("sas_settings_changed", handler);
  }, []);

  const slotTimeById = useMemo(() => {
    const map: Record<number, { start: string; end: string }> = {
      1: { start: "07:00", end: "09:15" },
      2: { start: "09:30", end: "11:45" },
      3: { start: "12:30", end: "14:45" },
      4: { start: "15:00", end: "17:15" },
    };
    for (const r of flat) {
      if (r.slot_id && (!map[r.slot_id] || (!r.start_time && !r.end_time))) {
        map[r.slot_id] = { start: r.start_time?.slice(0, 5) || map[r.slot_id]?.start, end: r.end_time?.slice(0, 5) || map[r.slot_id]?.end };
      }
    }
    return map;
  }, [flat]);

  const getSubjectColor = (key: string) => {
    const colors = ["card-blue", "card-teal", "card-purple", "card-green", "card-orange", "card-pink", "card-indigo", "card-red"];
    const hash = key.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className={`layout ${collapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="side-header">
          <button className="collapse-btn" onClick={() => setCollapsed((v) => !v)} title={collapsed ? "Mở rộng" : "Thu gọn"}>
            {collapsed ? "⮞" : "⮜"}
          </button>
          <div className="side-name">Giảng viên</div>
        </div>
        <nav className="side-nav">
          <Link href="/tongquan_gv" className="side-link">🏠 {!collapsed && "Trang tổng quan"}</Link>
          <Link href="/thongbao_gv" className="side-link">🔔 {!collapsed && "Thông báo"}</Link>
          <div className="side-link active">📅 {!collapsed && "Lịch giảng dạy"}</div>
          <Link href="/lophoc_gv" className="side-link">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/diemdanh_gv" className="side-link">🧍‍♂️ {!collapsed && "Điểm danh"}</Link>
          <Link href="/caidat_gv" className="side-link">⚙️ {!collapsed && "Cài đặt"}</Link>
        </nav>
      </aside>
      <header className="topbar">
        <div className="welcome">
          <div className="hello">Xin chào, {lecturer?.full_name || "Giảng viên"} 👋</div>
          <div className="date">Hôm nay: {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}</div>
        </div>
        <div className="controls">
          <button className="qr-btn" onClick={() => {
            if (confirm("Bạn có chắc muốn đăng xuất?")) {
              try { localStorage.removeItem("sas_user"); } catch {}
              window.location.href = "/login";
            }
          }}>🚪 Đăng xuất</button>
        </div>
      </header>
      <main className={`main ${themeDark ? "dark-theme" : "light-theme"}`}>{children}</main>
    </div>
  );

  if (loading) {
    return (
      <Shell>
        <div className="schedule-shell">
          <div>Đang tải lịch giảng dạy...</div>
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
        <div className="filters" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
          <select className="select" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select className="select" value={selectedWeekKey} onChange={(e) => setSelectedWeekKey(e.target.value)}>
            {weekOptions.map((w) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="qr-btn" title="Tuần trước" onClick={goToPrevWeek}>
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button className="qr-btn" title="Tuần hiện tại" onClick={goToCurrentWeek}>
              <i className="fa-solid fa-calendar-day" />
            </button>
            <button className="qr-btn" title="Tuần tiếp theo" onClick={goToNextWeek}>
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        </div>

        <div className="grid" style={{ marginBottom: 6 }}>
          <div></div>
          {DAYS.map((d) => (
            <div key={d} className="col-header">{d}</div>
          ))}
        </div>

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
                        <div
                          className={`class-card ${getSubjectColor(cell.subjectCode || cell.classId || cell.className || "CLS")}`}
                          onClick={() => {
                            const clsId = cell.classId || "";
                            if (clsId) {
                              router.push(`/diemdanh_gv?class=${encodeURIComponent(clsId)}&slot=${slotId}`);
                            }
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.15 }}>{cell.subjectCode || ""}</div>
                          <div style={{ fontSize: 12, opacity: 0.9 }}>{cell.classId || ""}</div>
                          <div className="class-time" style={{ fontSize: 12 }}>{(cell.startTime || slotTimeById[slotId]?.start)?.slice(0,5)} - {(cell.endTime || slotTimeById[slotId]?.end)?.slice(0,5)}</div>
                          <div className="class-lecturer" style={{ fontSize: 12 }}>{cell.teacherName || lecturer?.full_name || ""}</div>
                          <div className="class-room" style={{ fontSize: 12 }}>{cell.room ? `Phòng ${cell.room}` : ""}</div>
                        </div>
                        <div className="pop">
                          <h4>{cell.subjectName || cell.subjectCode || cell.className || cell.classId}</h4>
                          {cell.classId && <p><strong>Lớp:</strong> {cell.classId}</p>}
                          <p><strong>Thời gian:</strong> {(cell.startTime || slotTimeById[slotId]?.start)?.slice(0,5)} - {(cell.endTime || slotTimeById[slotId]?.end)?.slice(0,5)}</p>
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
