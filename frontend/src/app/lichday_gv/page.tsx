"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ViewMode = "week" | "month";

type TeachEvent = {
  id: string;
  classCode: string;
  subject: string;
  teacher: string;
  room: string;
  day: number;
  slotStart: number;
  slotEnd: number;
  color: string;
};

export default function LecturerSchedulePage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount] = useState(2);
  const [view, setView] = useState<ViewMode>("week");
  const [search, setSearch] = useState("");
  const [filterSemester, setFilterSemester] = useState("HK1 2025-2026");
  const [filterWeek, setFilterWeek] = useState("Tuần 8");
  const [filterClass, setFilterClass] = useState("Tất cả lớp");
  const [filterSubject, setFilterSubject] = useState("Tất cả môn");

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const SLOTS = [1,2,3,4,5,6];

  const [events, setEvents] = useState<TeachEvent[]>([]);
  const [drawer, setDrawer] = useState<TeachEvent | null>(null);

  useEffect(() => {
    setEvents([
      { id: "t1", classCode: "CN201", subject: ".NET", teacher: "Bạn", room: "A304", day: 1, slotStart: 1, slotEnd: 2, color: "#3B82F6" },
      { id: "t2", classCode: "CN202", subject: "CSDL", teacher: "Bạn", room: "B206", day: 1, slotStart: 4, slotEnd: 5, color: "#10B981" },
      { id: "t3", classCode: "CN203", subject: "CTDL", teacher: "Bạn", room: "B202", day: 3, slotStart: 2, slotEnd: 3, color: "#F59E0B" },
      { id: "t4", classCode: "CN204", subject: "Web", teacher: "Bạn", room: "C101", day: 5, slotStart: 1, slotEnd: 2, color: "#6366F1" },
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
      window.dispatchEvent(new CustomEvent("sas_settings_changed" as any, { detail: merged }));
    } catch {}
  };

  const filteredEvents = useMemo(() => {
    return events.filter(e =>
      (filterClass === "Tất cả lớp" || e.classCode === filterClass) &&
      (filterSubject === "Tất cả môn" || e.subject === filterSubject) &&
      (search === "" || `${e.classCode} ${e.subject} ${e.room}`.toLowerCase().includes(search.toLowerCase()))
    );
  }, [events, filterClass, filterSubject, search]);

  const autoArrange = () => {
    alert("Sắp xếp tự động (demo): sẽ gợi ý lịch tối ưu nếu có trùng giờ.");
  };

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
          <Link href="/tongquan_gv" className="side-link">🏠 {!collapsed && "Dashboard"}</Link>
          <Link href="/thongbao_gv" className="side-link">📢 {!collapsed && "Thông báo"}</Link>
          <Link href="/lichday_gv" className="side-link active">📅 {!collapsed && "Lịch giảng dạy"}</Link>
          <Link href="/lophoc_gv" className="side-link">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/diemdanh_gv" className="side-link">🧍‍♂️ {!collapsed && "Điểm danh"}</Link>
          <Link href="/caidat_gv" className="side-link">⚙️ {!collapsed && "Cài đặt"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="page-title">Lịch giảng dạy</div>
        <div className="controls">
          <div className="chip-group">
            <button className={`chip ${view==='week'?'active':''}`} onClick={()=>setView('week')}>🗓 Tuần</button>
            <button className={`chip ${view==='month'?'active':''}`} onClick={()=>setView('month')}>🗂 Tháng</button>
          </div>
          <div className="search">
            <i className="fas fa-search" />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Tìm lớp/môn/phòng" />
          </div>
          <div className="filter-line">
            <select className="input" value={filterSemester} onChange={(e)=>setFilterSemester(e.target.value)}>
              <option>HK1 2025-2026</option>
              <option>HK2 2025-2026</option>
              <option>Hè 2026</option>
            </select>
            <select className="input" value={filterWeek} onChange={(e)=>setFilterWeek(e.target.value)}>
              <option>Tuần 7</option>
              <option>Tuần 8</option>
              <option>Tuần 9</option>
            </select>
            <select className="input" value={filterClass} onChange={(e)=>setFilterClass(e.target.value)}>
              <option>Tất cả lớp</option>
              <option>CN201</option>
              <option>CN202</option>
              <option>CN203</option>
            </select>
            <select className="input" value={filterSubject} onChange={(e)=>setFilterSubject(e.target.value)}>
              <option>Tất cả môn</option>
              <option>.NET</option>
              <option>CSDL</option>
              <option>CTDL</option>
            </select>
          </div>
          <button className="btn-outline" onClick={autoArrange}>⚙️ Sắp xếp tự động</button>
          <button className="icon-btn" onClick={toggleDark} title="Chuyển giao diện">{dark?"🌙":"🌞"}</button>
          <button className="icon-btn notif" title="Thông báo">🔔{notifCount>0 && <span className="badge">{notifCount}</span>}</button>
          <button className="qr-btn" onClick={async ()=>{ 
            if (confirm('Bạn có chắc muốn đăng xuất?')) {
              try { await fetch('http://localhost:8080/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
              try { localStorage.removeItem('sas_user'); } catch {}
              window.location.href = '/login';
            }
          }}>🚪 Đăng xuất</button>
        </div>
      </header>

      <main className="main">{children}</main>
    </div>
  );

  const WeekView = () => (
    <div className="calendar">
      <div className="cal-head">
        <div></div>
        {DAYS.map(d=> <div key={d} className="col-head">{d}</div>)}
      </div>
      <div className="cal-grid">
        <div className="slot-col">
          {SLOTS.map(s => <div key={`s-${s}`} className="slot-head">Tiết {s}</div>)}
        </div>
        {DAYS.map((d, di) => (
          <div key={d} className="day-col">
            {SLOTS.map(s => <div key={`${d}-${s}`} className="cell"></div>)}
            {filteredEvents.filter(e=> e.day===di+1).map(e => {
              const top = ((e.slotStart-1) * 100) / SLOTS.length;
              const height = ((e.slotEnd - e.slotStart + 1) * 100) / SLOTS.length;
              return (
                <div key={e.id} className="event" style={{ top: `${top}%`, height: `${height}%`, background: e.color }} onClick={()=>setDrawer(e)}>
                  <div className="evt-title">[{e.classCode} - {e.subject}]</div>
                  <div className="evt-sub">Phòng: {e.room} | Tiết {e.slotStart}-{e.slotEnd}</div>
                  <button className="evt-btn" onClick={(ev)=>{ev.stopPropagation(); router.push('/lophoc_gv');}}>Chi tiết</button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  const MonthView = () => (
    <div className="month">
      <div className="month-head">
        {DAYS.map(d => <div key={`mh-${d}`} className="m-col-head">{d}</div>)}
      </div>
      <div className="month-grid">
        {Array.from({length: 35}).map((_,i)=> (
          <div key={`md-${i}`} className="m-cell">
            <div className="m-date">{i+1 <= 31 ? (i+1) : ''}</div>
            <div className="m-badges">
              {i%5===0 && <span className="badge-dot" style={{background:'#3B82F6'}} />}
              {i%7===0 && <span className="badge-dot" style={{background:'#10B981'}} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Shell>
      {view==='week' && <WeekView />}
      {view==='month' && <MonthView />}

      {drawer && (
        <div className="drawer" onClick={()=>setDrawer(null)}>
          <div className="drawer-panel" onClick={(e)=>e.stopPropagation()}>
            <div className="drawer-head">
              <div className="title">{drawer.classCode} - {drawer.subject}</div>
              <button className="icon-btn" onClick={()=>setDrawer(null)}>✖</button>
            </div>
            <div className="drawer-body">
              <div className="kv"><span className="k">Lớp</span><span className="v">{drawer.classCode}</span></div>
              <div className="kv"><span className="k">Môn</span><span className="v">{drawer.subject}</span></div>
              <div className="kv"><span className="k">Phòng</span><span className="v">{drawer.room}</span></div>
              <div className="kv"><span className="k">Thời gian</span><span className="v">Thứ {drawer.day+1}, Tiết {drawer.slotStart}-{drawer.slotEnd}</span></div>
              <div className="actions-row">
                <button className="qr-btn" onClick={()=>router.push('/lophoc_gv')}>Chi tiết lớp</button>
                <button className="qr-btn" onClick={()=>alert('Dời lịch (demo)')}>🕓 Dời lịch</button>
                <button className="qr-btn" onClick={()=>alert('Đổi phòng (demo)')}>🔁 Đổi phòng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
