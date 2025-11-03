"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MiniClass = { id: string; code: string; subject: string; day: string; time: string; room: string };
type NoteItem = { id: string; title: string; from: string; date: string };

type SettingsEventDetail = { themeDark: boolean };
const SETTINGS_CHANGED_EVENT = "sas_settings_changed";

export default function LecturerDashboardPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount] = useState(3);
  const [name] = useState("Nguyễn Văn A");

  const [stats] = useState({ classes: 4, sessionsToday: 2, students: 126, notifications: 3 });
  const [week, setWeek] = useState<MiniClass[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [attendanceNote] = useState("Lớp CN201 vừa được điểm danh 90% (45/50 sinh viên).");

  useEffect(() => {
    setWeek([
      { id: "w1", code: "CN201", subject: ".NET", day: "Thứ 2", time: "08:00–10:00", room: "A304" },
      { id: "w2", code: "CN202", subject: "CSDL", day: "Thứ 2", time: "13:00–15:00", room: "B206" },
      { id: "w3", code: "CN203", subject: "CTDL", day: "Thứ 4", time: "09:00–11:00", room: "B202" },
      { id: "w4", code: "CN204", subject: "Web", day: "Thứ 6", time: "07:00–09:00", room: "C101" },
    ]);
    setNotes([
      { id: "n1", title: "Thông báo họp giáo viên thứ 4", from: "Phòng đào tạo", date: "25/10/2025" },
      { id: "n2", title: "Lịch bảo trì hệ thống LMS", from: "Admin hệ thống", date: "23/10/2025" },
      { id: "n3", title: "Nộp bài tập tuần 3 lớp CN201", from: "Bạn", date: "22/10/2025" },
    ]);
    try {
      const saved = localStorage.getItem("sas_settings");
      if (saved) {
        const s = JSON.parse(saved);
        setDark(!!s.themeDark);
        document.documentElement.style.colorScheme = s.themeDark ? "dark" : "light";
      }
    } catch {}
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    try {
      const saved = localStorage.getItem("sas_settings");
      const prev = saved ? JSON.parse(saved) : {};
      const merged = { ...prev, themeDark: next };
      localStorage.setItem("sas_settings", JSON.stringify(merged));
      document.documentElement.style.colorScheme = next ? "dark" : "light";
      window.dispatchEvent(new CustomEvent<SettingsEventDetail>(SETTINGS_CHANGED_EVENT, { detail: merged }));
    } catch {}
  };

  const dateStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
    } catch { return ""; }
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SettingsEventDetail>).detail;
      if (!detail) return;
      document.documentElement.style.colorScheme = detail.themeDark ? "dark" : "light";
      setDark(detail.themeDark);
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
  }, []);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className={`layout ${collapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="side-header">
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Mở rộng" : "Thu gọn"}>
            {collapsed ? "⮞" : "⮜"}
          </button>
          {!collapsed && <div className="side-name">Smart Attendance</div>}
        </div>
        <nav className="side-nav">
          <Link href="/tongquan_gv" className="side-link active">🏠 {!collapsed && "Dashboard"}</Link>
          <Link href="/thongbao_gv" className="side-link">📢 {!collapsed && "Thông báo"}</Link>
          <Link href="/lichday_gv" className="side-link">📅 {!collapsed && "Lịch giảng dạy"}</Link>
          <Link href="/lophoc_gv" className="side-link">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/diemdanh_gv" className="side-link">🧍‍♂️ {!collapsed && "Điểm danh"}</Link>
          <Link href="/caidat_gv" className="side-link">⚙️ {!collapsed && "Cài đặt"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="welcome">
          <div className="hello">Chào buổi sáng, {name} 👋</div>
          <div className="date">{dateStr}</div>
        </div>
        <div className="controls">
          <button className="icon-btn" onClick={toggleDark} title="Chuyển giao diện">{dark?"🌙":"🌞"}</button>
          <button className="icon-btn notif" title="Thông báo">🔔{notifCount>0 && <span className="badge">{notifCount}</span>}</button>
          <div className="avatar-menu">
            <div className="avatar">🧑‍🏫</div>
            <div className="dropdown">
              <a href="#" onClick={(e)=>e.preventDefault()}>Cài đặt</a>
              <a href="#" onClick={(e)=>{e.preventDefault(); if(confirm("Đăng xuất?")){ localStorage.removeItem("sas_user"); router.push("/login"); }}}>Đăng xuất</a>
            </div>
          </div>
          <button className="qr-btn" onClick={async ()=>{ 
            if (confirm('Bạn có chắc muốn đăng xuất?')) {
              try { await fetch('http://localhost:8080/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
              try { localStorage.removeItem('sas_user'); } catch {}
              router.push('/login');
            }
          }}>🚪 Đăng xuất</button>
        </div>
      </header>

      <main className="main">{children}</main>
    </div>
  );

  return (
    <Shell>
      <section className="cards">
        <div className="card"><div className="card-title">🏫 Lớp đang dạy</div><div className="card-num">{stats.classes}</div></div>
        <div className="card"><div className="card-title">📅 Buổi dạy hôm nay</div><div className="card-num">{stats.sessionsToday}</div></div>
        <div className="card"><div className="card-title">👨‍🎓 Tổng sinh viên</div><div className="card-num">{stats.students}</div></div>
        <div className="card"><div className="card-title">📢 Thông báo mới</div><div className="card-num">{stats.notifications}</div></div>
      </section>

      <div className="grid2">
        <div className="panel">
          <div className="section-title">Lịch nhanh (tuần này)</div>
          <div className="list">
            {week.map(w => (
              <div key={w.id} className="row" onClick={()=>router.push('/lichday_gv')}>
                <div className="left">
                  <div className="primary">{w.day} • {w.time}</div>
                  <div className="muted">{w.code} – {w.subject}</div>
                </div>
                <div className="right">Phòng {w.room} → Chi tiết</div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="section-title">Thông báo gần nhất</div>
          <div className="list">
            {notes.map(n => (
              <div key={n.id} className="row">
                <div className="left">
                  <div className="primary">🔔 {n.title}</div>
                  <div className="muted">{n.from}</div>
                </div>
                <div className="right">{n.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="section-title">Điểm danh gần nhất</div>
        <div className="attendance-note">{attendanceNote}</div>
      </div>
    </Shell>
  );
}

