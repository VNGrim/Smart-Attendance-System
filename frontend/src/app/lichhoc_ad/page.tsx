"use client";

import Link from "next/link";
import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_IDS = [1, 2, 3, 4];

type ScheduleCell = {
  classId: string;
  className: string;
  subjectName: string;
  teacherName: string;
  room: string;
  startTime: string | null;
  endTime: string | null;
};

type FlatRow = {
  day: string;
  slot_id: number;
  start_time: string | null;
  end_time: string | null;
  room: string;
  class_id: string;
  class_name: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
};

const API_BASE = "http://localhost:8080/api/lichhoc/admin/schedule";

function getSubjectColor(name: string) {
  const colors = [
    "card-blue",
    "card-teal",
    "card-purple",
    "card-green",
    "card-orange",
    "card-pink",
    "card-indigo",
    "card-red",
  ];
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function getSubjectIcon(name: string) {
  if (/web/i.test(name)) return "🌐";
  if (/database|db/i.test(name)) return "🗄️";
  if (/algorithm|alg/i.test(name)) return "🧮";
  if (/network|net/i.test(name)) return "🌐";
  if (/ai|machine/i.test(name)) return "🤖";
  if (/mobile|app/i.test(name)) return "📱";
  if (/game/i.test(name)) return "🎮";
  if (/security|sec/i.test(name)) return "🔒";
  return "📚";
}

export default function AdminSchedulePage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("2025");
  const [week, setWeek] = useState("29/09 - 05/10");
  const [grid, setGrid] = useState<Record<number, Record<string, ScheduleCell | null>>>({});
  const [flat, setFlat] = useState<FlatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        setLoading(true);
        setError("");
        const resp = await fetch(API_BASE, { credentials: "include" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!json?.success) throw new Error(json?.message || "Không thể lấy dữ liệu lịch học");
        if (!mounted) return;
        const nextGrid: Record<number, Record<string, ScheduleCell | null>> = {};
        SLOT_IDS.forEach((slot) => {
          nextGrid[slot] = {};
          DAYS.forEach((day) => {
            nextGrid[slot][day] = null;
          });
        });
        (json.data?.flat || []).forEach((row: FlatRow) => {
          const dayKey = row.day;
          const slotId = row.slot_id;
          if (!SLOT_IDS.includes(slotId) || !DAYS.includes(dayKey)) return;
          nextGrid[slotId][dayKey] = {
            classId: row.class_id,
            className: row.class_name,
            subjectName: row.subject_name,
            teacherName: row.teacher_name,
            room: row.room,
            startTime: row.start_time,
            endTime: row.end_time,
          };
        });
        setGrid(nextGrid);
        setFlat(json.data?.flat || []);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Lỗi tải dữ liệu");
        setGrid({});
        setFlat([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();

    try {
      const saved = localStorage.getItem("sas_settings");
      if (saved) {
        const s = JSON.parse(saved);
        document.documentElement.style.colorScheme = s.themeDark ? "dark" : "light";
      }
    } catch {}

    const handler = (e: any) => {
      const s = e?.detail;
      if (!s) return;
      document.documentElement.style.colorScheme = s.themeDark ? "dark" : "light";
    };
    window.addEventListener("sas_settings_changed" as any, handler);

    return () => {
      mounted = false;
      window.removeEventListener("sas_settings_changed" as any, handler);
    };
  }, []);

  const slotTimeById = useMemo(() => {
    const map: Record<number, { start: string; end: string }> = {};
    for (const row of flat) {
      if (row.slot_id && !map[row.slot_id]) {
        map[row.slot_id] = {
          start: row.start_time?.slice(0, 5) || "",
          end: row.end_time?.slice(0, 5) || "",
        };
      }
    }
    return map;
  }, [flat]);

  const filteredGrid = useMemo(() => {
    if (!search.trim()) return grid;
    const keyword = search.toLowerCase();
    const next: typeof grid = {};
    SLOT_IDS.forEach((slot) => {
      next[slot] = {} as Record<string, ScheduleCell | null>;
      DAYS.forEach((day) => {
        const cell = grid?.[slot]?.[day] || null;
        if (!cell) {
          next[slot][day] = null;
          return;
        }
        const joined = `${cell.className} ${cell.subjectName} ${cell.teacherName} ${cell.room}`.toLowerCase();
        next[slot][day] = joined.includes(keyword) ? cell : null;
      });
    });
    return next;
  }, [grid, search]);

  if (loading) {
    return (
      <Shell collapsed={collapsed} setCollapsed={setCollapsed} router={router} search={search} setSearch={setSearch}>
        <div className="schedule-shell">Đang tải dữ liệu lịch học...</div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell collapsed={collapsed} setCollapsed={setCollapsed} router={router} search={search} setSearch={setSearch}>
        <div className="schedule-shell" style={{ color: "#ef4444" }}>{error}</div>
      </Shell>
    );
  }

  return (
    <Shell collapsed={collapsed} setCollapsed={setCollapsed} router={router} search={search} setSearch={setSearch}>
      <div className="schedule-shell">
        <div className="filters" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
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
        <div className="grid" style={{ marginBottom: 6 }}>
          <div></div>
          {DAYS.map((day) => (
            <div key={day} className="col-header">{day}</div>
          ))}
        </div>
        <div className="grid">
          {SLOT_IDS.map((slot) => (
            <Fragment key={slot}>
              <div className="row-header">
                <div className="slot-badge">Slot {slot}</div>
                {slotTimeById[slot] && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {slotTimeById[slot].start} - {slotTimeById[slot].end}
                  </div>
                )}
              </div>
              {DAYS.map((day) => {
                const cell = filteredGrid?.[slot]?.[day] || null;
                return (
                  <div key={`${day}-${slot}`} className="cell">
                    {cell ? (
                      <>
                        <div className={`class-card ${getSubjectColor(cell.className)}`}>
                          <div style={{ fontSize: 16 }}>{getSubjectIcon(cell.className)}</div>
                          <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.15, textShadow: "0 1px 0 rgba(0,0,0,0.15)" }}>{cell.className}</div>
                          <div className="class-time" style={{ fontSize: 12 }}>
                            {cell.startTime?.slice(0, 5)} - {cell.endTime?.slice(0, 5)}
                          </div>
                          <div className="class-lecturer" style={{ fontSize: 12 }}>{cell.teacherName}</div>
                          {cell.room && (
                            <div className="class-room" style={{ fontSize: 12 }}>Phòng {cell.room}</div>
                          )}
                        </div>
                        <div className="pop">
                          <h4>{cell.className}</h4>
                          <p>
                            <strong>Thời gian:</strong> {cell.startTime?.slice(0, 5)} - {cell.endTime?.slice(0, 5)}
                          </p>
                          <p>
                            <strong>Giảng viên:</strong> {cell.teacherName}
                          </p>
                          {cell.room && (
                            <p>
                              <strong>Phòng:</strong> {cell.room}
                            </p>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </Shell>
  );
}

type ShellProps = {
  collapsed: boolean;
  setCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
  router: ReturnType<typeof useRouter>;
  search: string;
  setSearch: (value: string) => void;
  children: ReactNode;
};

function Shell({ collapsed, setCollapsed, router, search, setSearch, children }: ShellProps) {
  return (
    <div className={`layout ${collapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="side-header">
          <button
            className="collapse-btn"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? "Mở rộng" : "Thu gọn"}
          >
            {collapsed ? "⮞" : "⮜"}
          </button>
          {!collapsed && <div className="side-name">Smart Attendance</div>}
        </div>
        <nav className="side-nav">
          <Link href="/tongquan_ad" className="side-link" title="Dashboard">
            🏠 {!collapsed && "Dashboard"}
          </Link>
          <Link href="/thongbao_ad" className="side-link" title="Thông báo">
            📢 {!collapsed && "Thông báo"}
          </Link>
          <Link href="/sinhvien_ad" className="side-link" title="Sinh viên">
            👨‍🎓 {!collapsed && "Sinh viên"}
          </Link>
          <Link href="/giangvien_ad" className="side-link" title="Giảng viên">
            👩‍🏫 {!collapsed && "Giảng viên"}
          </Link>
          <Link href="/lophoc_ad" className="side-link" title="Lớp học">
            🏫 {!collapsed && "Lớp học"}
          </Link>
          <Link href="/lichhoc_ad" className="side-link active" title="Lịch học">
            📅 {!collapsed && "Lịch học"}
          </Link>
          <Link href="/taikhoan_ad" className="side-link" title="Tài khoản">
            🔑 {!collapsed && "Tài khoản"}
          </Link>
          <Link href="/caidat_ad" className="side-link" title="Cấu hình">
            ⚙️ {!collapsed && "Cấu hình"}
          </Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="welcome">
          <div className="hello">Bảng lịch lớp học</div>
          <div className="date">Hôm nay: {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}</div>
        </div>
        <div className="controls">
          <div className="search">
            <i className="fas fa-search" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm lớp, môn, giảng viên, phòng" />
          </div>
          <button className="qr-btn" onClick={async () => {
            if (confirm("Bạn có chắc muốn đăng xuất?")) {
              try {
                await fetch("http://localhost:8080/api/auth/logout", {
                  method: "POST",
                  credentials: "include",
                });
              } catch {}
              try {
                localStorage.removeItem("sas_user");
              } catch {}
              router.push("/login");
            }
          }}>
            🚪 Đăng xuất
          </button>
        </div>
      </header>

      <main className="main">{children}</main>
    </div>
  );
}
