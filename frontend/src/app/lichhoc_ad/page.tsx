"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ViewMode = "day" | "week" | "month";

type EventItem = {
  id: string;
  classCode: string;
  className: string;
  subject: string;
  teacher: string;
  room: string;
  day: number;
  slotStart: number;
  slotEnd: number;
  color: string;
  startDate?: string;
  endDate?: string;
};

export default function AdminSchedulePage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount] = useState(2);
  const [view, setView] = useState<ViewMode>("week");
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("Tất cả lớp");
  const [filterTeacher, setFilterTeacher] = useState("Tất cả giảng viên");
  const [filterRoom, setFilterRoom] = useState("Tất cả phòng");
  const [filterMajor, setFilterMajor] = useState("Tất cả ngành");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [drawer, setDrawer] = useState<EventItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState<EventItem | null>(null);

  useEffect(() => {
    setEvents([
      { id: "e1", classCode: "SE1601", className: "SE1601", subject: "Lập trình .NET", teacher: "Nguyễn Văn A", room: "B206", day: 2, slotStart: 3, slotEnd: 5, color: "#3B82F6", startDate: "2025-10-20", endDate: "2025-12-10" },
      { id: "e2", classCode: "SE1602", className: "SE1602", subject: "Cơ sở dữ liệu", teacher: "Trần Thị B", room: "B202", day: 3, slotStart: 2, slotEnd: 4, color: "#10B981", startDate: "2025-10-21", endDate: "2025-12-07" },
      { id: "e3", classCode: "SE1603", className: "SE1603", subject: "Cấu trúc dữ liệu", teacher: "Nguyễn Văn A", room: "B206", day: 2, slotStart: 4, slotEnd: 6, color: "#6366F1", startDate: "2025-10-20", endDate: "2025-12-10" },
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

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const SLOTS = [1,2,3,4,5,6];

  const filteredEvents = useMemo(() => {
    return events.filter(e =>
      (filterClass === "Tất cả lớp" || e.classCode === filterClass || e.className === filterClass) &&
      (filterTeacher === "Tất cả giảng viên" || e.teacher === filterTeacher) &&
      (filterRoom === "Tất cả phòng" || e.room === filterRoom) &&
      (filterMajor === "Tất cả ngành" || e.subject.toLowerCase().includes(filterMajor.toLowerCase())) &&
      (search === "" || `${e.classCode} ${e.className} ${e.subject} ${e.teacher} ${e.room}`.toLowerCase().includes(search.toLowerCase()))
    );
  }, [events, filterClass, filterTeacher, filterRoom, filterMajor, search]);

  const conflicts = useMemo(() => {
    const map: Record<string, { roomConflict?: boolean; teacherConflict?: boolean }>= {};
    for (let d=1; d<=7; d++) {
      const dayEvents = filteredEvents.filter(e=> (e.day===d));
      for (let i=0;i<dayEvents.length;i++) {
        for (let j=i+1;j<dayEvents.length;j++) {
          const a=dayEvents[i], b=dayEvents[j];
          const overlap = !(a.slotEnd < b.slotStart || b.slotEnd < a.slotStart);
          if (overlap) {
            if (a.room===b.room) { map[a.id] = { ...map[a.id], roomConflict: true }; map[b.id] = { ...map[b.id], roomConflict: true }; }
            if (a.teacher===b.teacher) { map[a.id] = { ...map[a.id], teacherConflict: true }; map[b.id] = { ...map[b.id], teacherConflict: true }; }
          }
        }
      }
    }
    return map;
  }, [filteredEvents]);

  const onOpenCreate = () => { setEdit(null); setModalOpen(true); };
  const onOpenEdit = (e: EventItem) => { setEdit(e); setModalOpen(true); };

  const [formSubject, setFormSubject] = useState("Lập trình .NET");
  const [formClass, setFormClass] = useState("SE1601");
  const [formTeacher, setFormTeacher] = useState("Nguyễn Văn A");
  const [formRoom, setFormRoom] = useState("B206");
  const [formDay, setFormDay] = useState(2);
  const [formSlotStart, setFormSlotStart] = useState(3);
  const [formSlotEnd, setFormSlotEnd] = useState(5);
  const [formStartDate, setFormStartDate] = useState("2025-10-20");
  const [formEndDate, setFormEndDate] = useState("2025-12-10");
  const [formNote, setFormNote] = useState("");
  const [formRepeat, setFormRepeat] = useState("weekly");

  useEffect(() => {
    if (edit) {
      setFormSubject(edit.subject); setFormClass(edit.classCode); setFormTeacher(edit.teacher); setFormRoom(edit.room);
      setFormDay(edit.day); setFormSlotStart(edit.slotStart); setFormSlotEnd(edit.slotEnd);
      setFormStartDate(edit.startDate||""); setFormEndDate(edit.endDate||""); setFormNote(""); setFormRepeat("weekly");
    } else {
      setFormSubject("Lập trình .NET"); setFormClass("SE1601"); setFormTeacher("Nguyễn Văn A"); setFormRoom("B206");
      setFormDay(2); setFormSlotStart(3); setFormSlotEnd(5); setFormStartDate("2025-10-20"); setFormEndDate("2025-12-10"); setFormNote(""); setFormRepeat("weekly");
    }
  }, [modalOpen, edit]);

  const onSubmit = (scheduleMode: "once" | "repeat") => {
    const payload: Omit<EventItem, 'id'> = { subject: formSubject, classCode: formClass, className: formClass, teacher: formTeacher, room: formRoom, day: formDay, slotStart: formSlotStart, slotEnd: formSlotEnd, color: "#3B82F6", startDate: formStartDate, endDate: formEndDate };
    if (edit) {
      setEvents(prev => prev.map(e => e.id===edit.id ? { ...e, ...payload } : e));
    } else {
      const id = Math.random().toString(36).slice(2, 9);
      setEvents(prev => prev.concat({ id, ...payload }));
    }
    setModalOpen(false);
  };

  const autoSchedule = () => {
    alert("Sắp xếp tự động: đề xuất thời gian dựa trên lịch trống (placeholder)");
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
          <Link href="/tongquan_ad" className="side-link" title="Dashboard">🏠 {!collapsed && "Dashboard"}</Link>
          <Link href="/thongbao_ad" className="side-link" title="Thông báo">📢 {!collapsed && "Thông báo"}</Link>
          <Link href="/sinhvien_ad" className="side-link" title="Sinh viên">👨‍🎓 {!collapsed && "Sinh viên"}</Link>
          <Link href="/giangvien_ad" className="side-link" title="Giảng viên">👩‍🏫 {!collapsed && "Giảng viên"}</Link>
          <Link href="/lophoc_ad" className="side-link" title="Lớp học">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/lichhoc_ad" className="side-link active" title="Lịch học">📅 {!collapsed && "Lịch học"}</Link>
          <Link href="/taikhoan_ad" className="side-link" title="Tài khoản">🔑 {!collapsed && "Tài khoản"}</Link>
          <Link href="/caidat_ad" className="side-link" title="Cấu hình">⚙️ {!collapsed && "Cấu hình"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="top-left">
          <div className="page-title">Quản lý Lịch học</div>
        </div>
        <div className="controls">
          <div className="chip-group">
            <button className={`chip ${view==='day'?'active':''}`} onClick={()=>setView('day')}>📅 Ngày</button>
            <button className={`chip ${view==='week'?'active':''}`} onClick={()=>setView('week')}>🗓 Tuần</button>
            <button className={`chip ${view==='month'?'active':''}`} onClick={()=>setView('month')}>🗂 Tháng</button>
          </div>
          <div className="search">
            <i className="fas fa-search" />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Tìm lớp, GV, phòng, khóa" />
          </div>
          <div className="filter-line">
            <select className="input" value={filterClass} onChange={(e)=>setFilterClass(e.target.value)}>
              <option>Tất cả lớp</option>
              <option>SE1601</option>
              <option>SE1602</option>
              <option>SE1603</option>
            </select>
            <select className="input" value={filterTeacher} onChange={(e)=>setFilterTeacher(e.target.value)}>
              <option>Tất cả giảng viên</option>
              <option>Nguyễn Văn A</option>
              <option>Trần Thị B</option>
            </select>
            <select className="input" value={filterRoom} onChange={(e)=>setFilterRoom(e.target.value)}>
              <option>Tất cả phòng</option>
              <option>B206</option>
              <option>B202</option>
            </select>
            <select className="input" value={filterMajor} onChange={(e)=>setFilterMajor(e.target.value)}>
              <option>Tất cả ngành</option>
              <option>CNTT</option>
              <option>Điện - Điện tử</option>
            </select>
          </div>
          <button className="btn-primary" onClick={onOpenCreate}>+ Tạo lịch mới</button>
          <button className="btn-outline" onClick={autoSchedule}>⚙️ Sắp xếp tự động</button>
          <button className="icon-btn" onClick={toggleDark} title="Chuyển giao diện">{dark?"🌙":"🌞"}</button>
          <button className="icon-btn notif" title="Thông báo">🔔{notifCount>0 && <span className="badge">{notifCount}</span>}</button>
          <div className="avatar-menu">
            <div className="avatar">🧑‍💼</div>
            <div className="dropdown">
              <a href="#" onClick={(e)=>e.preventDefault()}>Hồ sơ</a>
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
            {SLOTS.map(s => (
              <div key={`${d}-${s}`} className="cell"></div>
            ))}
            {filteredEvents.filter(e=> e.day===di+1).map(e => {
              const top = ((e.slotStart-1) * 100) / SLOTS.length;
              const height = ((e.slotEnd - e.slotStart + 1) * 100) / SLOTS.length;
              const cf = conflicts[e.id] || {};
              return (
                <div key={e.id} className={`event ${cf.roomConflict? 'conflict-room':''} ${cf.teacherConflict? 'conflict-teacher':''}`} style={{ top: `${top}%`, height: `${height}%`, background: e.color }} onClick={()=>setDrawer(e)}>
                  <div className="evt-title">[{e.classCode} - {e.subject}]</div>
                  <div className="evt-sub">GV: {e.teacher}</div>
                  <div className="evt-sub">Phòng: {e.room} | Tiết {e.slotStart}-{e.slotEnd}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  const DayView = () => (
    <div className="calendar day">
      <div className="cal-head">
        <div></div>
        <div className="col-head">Hôm nay</div>
      </div>
      <div className="cal-grid">
        <div className="slot-col">
          {SLOTS.map(s => <div key={`sd-${s}`} className="slot-head">Tiết {s}</div>)}
        </div>
        <div className="day-col">
          {SLOTS.map(s => <div key={`cd-${s}`} className="cell"></div>)}
          {filteredEvents.filter(e=> e.day===2).map(e => {
            const top = ((e.slotStart-1) * 100) / SLOTS.length;
            const height = ((e.slotEnd - e.slotStart + 1) * 100) / SLOTS.length;
            const cf = conflicts[e.id] || {};
            return (
              <div key={e.id} className={`event ${cf.roomConflict? 'conflict-room':''} ${cf.teacherConflict? 'conflict-teacher':''}`} style={{ top: `${top}%`, height: `${height}%`, background: e.color }} onClick={()=>setDrawer(e)}>
                <div className="evt-title">[{e.classCode} - {e.subject}]</div>
                <div className="evt-sub">GV: {e.teacher}</div>
                <div className="evt-sub">Phòng: {e.room} | Tiết {e.slotStart}-{e.slotEnd}</div>
              </div>
            );
          })}
        </div>
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
            <div className="m-dots">
              {i%5===0 && <span className="dot" />}
              {i%7===0 && <span className="dot green" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Shell>
      {view === 'week' && <WeekView />}
      {view === 'day' && <DayView />}
      {view === 'month' && <MonthView />}

      {drawer && (
        <div className="drawer" onClick={() => setDrawer(null)}>
          <div className="drawer-panel" onClick={(e)=>e.stopPropagation()}>
            <div className="drawer-head">
              <div className="title">{drawer.classCode} - {drawer.subject}</div>
              <button className="icon-btn" onClick={() => setDrawer(null)}>✖</button>
            </div>
            <div className="drawer-body">
              <div className="kv"><span className="k">Lớp học</span><span className="v">{drawer.className}</span></div>
              <div className="kv"><span className="k">Môn học</span><span className="v">{drawer.subject}</span></div>
              <div className="kv"><span className="k">Giảng viên</span><span className="v">{drawer.teacher}</span></div>
              <div className="kv"><span className="k">Phòng</span><span className="v">{drawer.room}</span></div>
              <div className="kv"><span className="k">Thời gian</span><span className="v">Thứ {drawer.day}, Tiết {drawer.slotStart}–{drawer.slotEnd}</span></div>
              <div className="kv"><span className="k">Ngày</span><span className="v">{drawer.startDate} – {drawer.endDate}</span></div>
              <div className="section-title">Sinh viên (rút gọn)</div>
              <div className="list small">
                <div>SE12345 - Nguyễn Minh Hào</div>
                <div>SE12346 - Trần Thị Huyền</div>
                <button className="chip" onClick={()=>alert('Xem tất cả sinh viên')}>Xem tất cả</button>
              </div>
              <div className="actions-row">
                <button className="qr-btn" onClick={()=>{ setDrawer(null); onOpenEdit(drawer); }}>✏️ Chỉnh sửa</button>
                <button className="qr-btn" onClick={()=>alert('Đổi phòng')}>🔁 Đổi phòng</button>
                <button className="qr-btn" onClick={()=>alert('Dời lịch')}>🕓 Dời lịch</button>
                <button className="qr-btn" onClick={()=>{ if(confirm('Xóa buổi học?')) { setEvents(prev=>prev.filter(e=>e.id!==drawer.id)); setDrawer(null); } }}>🗑 Xóa</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal" onClick={() => setModalOpen(false)}>
          <div className="modal-content wide" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="title">{edit?"Chỉnh sửa lịch học":"Tạo lịch mới"}</div>
              <button className="icon-btn" onClick={() => setModalOpen(false)}>✖</button>
            </div>
            <div className="modal-body grid2">
              <div className="form-col">
                <label className="label">Môn học</label>
                <select className="input" value={formSubject} onChange={(e)=>setFormSubject(e.target.value)}>
                  <option>Lập trình .NET</option>
                  <option>Cơ sở dữ liệu</option>
                  <option>Cấu trúc dữ liệu</option>
                </select>
                <label className="label">Lớp học</label>
                <select className="input" value={formClass} onChange={(e)=>setFormClass(e.target.value)}>
                  <option>SE1601</option>
                  <option>SE1602</option>
                  <option>SE1603</option>
                </select>
                <label className="label">Giảng viên</label>
                <select className="input" value={formTeacher} onChange={(e)=>setFormTeacher(e.target.value)}>
                  <option>Nguyễn Văn A</option>
                  <option>Trần Thị B</option>
                </select>
                <label className="label">Phòng học</label>
                <select className="input" value={formRoom} onChange={(e)=>setFormRoom(e.target.value)}>
                  <option>B206</option>
                  <option>B202</option>
                </select>
              </div>
              <div className="form-col">
                <label className="label">Thời gian</label>
                <div className="grid-3">
                  <select className="input" value={formDay} onChange={(e)=>setFormDay(parseInt(e.target.value))}>
                    <option value={1}>Thứ 2</option>
                    <option value={2}>Thứ 3</option>
                    <option value={3}>Thứ 4</option>
                    <option value={4}>Thứ 5</option>
                    <option value={5}>Thứ 6</option>
                  </select>
                  <select className="input" value={formSlotStart} onChange={(e)=>setFormSlotStart(parseInt(e.target.value))}>
                    {SLOTS.map(s=> <option key={`ss-${s}`} value={s}>Tiết {s}</option>)}
                  </select>
                  <select className="input" value={formSlotEnd} onChange={(e)=>setFormSlotEnd(parseInt(e.target.value))}>
                    {SLOTS.map(s=> <option key={`se-${s}`} value={s}>Đến {s}</option>)}
                  </select>
                </div>
                <div className="grid-2">
                  <input className="input" type="date" value={formStartDate} onChange={(e)=>setFormStartDate(e.target.value)} />
                  <input className="input" type="date" value={formEndDate} onChange={(e)=>setFormEndDate(e.target.value)} />
                </div>
                <label className="label">Số buổi / Tần suất</label>
                <select className="input" value={formRepeat} onChange={(e)=>setFormRepeat(e.target.value)}>
                  <option value="once">1 lần</option>
                  <option value="weekly">Hàng tuần</option>
                  <option value="biweekly">Cách tuần</option>
                </select>
                <label className="label">Ghi chú</label>
                <textarea className="input" rows={3} value={formNote} onChange={(e)=>setFormNote(e.target.value)} placeholder="Ghi chú thêm..."></textarea>
              </div>
            </div>
            <div className="modal-foot space">
              <button className="qr-btn" onClick={()=>setModalOpen(false)}>Hủy</button>
              <div className="actions-row">
                <button className="qr-btn" onClick={()=>onSubmit("once")}>💾 Lưu</button>
                <button className="qr-btn" onClick={()=>onSubmit("repeat")}>🕓 Lưu & Lên lịch định kỳ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

