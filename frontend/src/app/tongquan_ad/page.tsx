"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Activity = {
  time: string;
  action: string;
  actor: string;
  id: string;
  detail?: string;
};

export default function AdminOverviewPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(false);
  const [notifCount] = useState(3);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [modal, setModal] = useState<Activity | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [studentDelta, setStudentDelta] = useState<number | null>(null);
  const [lecturerCount, setLecturerCount] = useState<number | null>(null);
  const [lecturerDelta, setLecturerDelta] = useState<number | null>(null);

  // Mock summary numbers
  const stats = {
    students: { value: 2340, delta: "+50 so với tháng trước" },
    lecturers: { value: 128, delta: "+10 so với tháng trước" },
    classes: { value: 64 },
    sessionsToday: { value: 32 },
  };

  // Mock chart data
  const semesters = ["HK1", "HK2", "HK3", "HK4"] as const;
  const barData = [520, 610, 480, 710];
  const maxBar = Math.max(...barData) || 1;

  const totalUsers = 2473;
  const donutParts = [
    { label: "Sinh viên", value: 0.9, color: "#3B82F6" },
    { label: "Giảng viên", value: 0.05, color: "#10B981" },
    { label: "Admin", value: 0.05, color: "#8B5CF6" },
  ];

  useEffect(() => {
    // Seed activity list
    setActivity([
      { id: "1", time: "10:45 25/10/2025", action: "Tạo lớp CNTT_K24_1", actor: "Admin Nguyễn A", detail: "Đã tạo lớp mới cho khóa K24 ngành CNTT, sĩ số dự kiến 45" },
      { id: "2", time: "09:20 25/10/2025", action: "Cập nhật lịch học lớp JS22", actor: "GV001", detail: "Điều chỉnh ca học từ Slot 2 sang Slot 3" },
      { id: "3", time: "08:55 25/10/2025", action: "Gửi thông báo \"Nghỉ học 26/10\"", actor: "Admin", detail: "Thông báo toàn trường về lịch nghỉ đột xuất ngày 26/10" },
      { id: "4", time: "08:30 25/10/2025", action: "Thêm tài khoản sinh viên SV2025123", actor: "Admin", detail: "Cấp tài khoản mới cho tân sinh viên khóa 2025" },
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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:8080/api/admin/overview/students/count", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.count === "number") setStudentCount(data.count);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:8080/api/admin/overview/lecturers/count", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.count === "number") setLecturerCount(data.count);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:8080/api/admin/overview/students/monthly-delta", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.delta === "number") setStudentDelta(data.delta);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:8080/api/admin/overview/lecturers/monthly-delta", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.delta === "number") setLecturerDelta(data.delta);
        }
      } catch {}
    })();
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

  const onCardClick = (key: string) => {
    if (key === "students") router.push("/sinhvien_ad");
    if (key === "lecturers") router.push("/giangvien_ad");
    if (key === "classes") router.push("/lophoc_ad");
    if (key === "sessionsToday") router.push("/lichhoc_ad");
  };

  const donutStroke = 100; // circumference percentage base for SVG stroke-dasharray
  const cumulative = useMemo(() => {
    const arr: { start: number; len: number; color: string; label: string }[] = [];
    let acc = 0;
    for (const p of donutParts) {
      const len = p.value * donutStroke;
      arr.push({ start: acc, len, color: p.color, label: p.label });
      acc += len;
    }
    return arr;
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
          <Link href="/tongquan_ad" className="side-link active" title="Dashboard">🏠 {!collapsed && "Dashboard"}</Link>
          <Link href="/thongbao_ad" className="side-link" title="Thông báo">📢 {!collapsed && "Thông báo"}</Link>
          <Link href="/sinhvien_ad" className="side-link" title="Sinh viên">👨‍🎓 {!collapsed && "Sinh viên"}</Link>
          <Link href="/giangvien_ad" className="side-link" title="Giảng viên">👩‍🏫 {!collapsed && "Giảng viên"}</Link>
          <Link href="/lophoc_ad" className="side-link" title="Lớp học">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/lichhoc_ad" className="side-link" title="Lịch học">📅 {!collapsed && "Lịch học"}</Link>
          <Link href="/taikhoan_ad" className="side-link" title="Tài khoản">🔑 {!collapsed && "Tài khoản"}</Link>
          <Link href="/caidat_ad" className="side-link" title="Cấu hình">⚙️ {!collapsed && "Cấu hình"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="top-left">
          <div className="page-title">📊 Tổng quan hệ thống</div>
        </div>
        <div className="controls">
          <div className="search">
            <i className="fas fa-search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm sinh viên, giảng viên, lớp…"
            />
          </div>
          <button className="icon-btn" onClick={toggleDark} title="Chuyển giao diện">
            {dark ? "🌙" : "🌞"}
          </button>
          <button className="icon-btn notif" title="Thông báo">
            🔔
            {notifCount > 0 && <span className="badge">{notifCount}</span>}
          </button>
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

  return (
    <Shell>
      {/* A. Cards Row */}
      <section className="cards">
        <div className="card stat-card gradient-blue" onClick={() => onCardClick("students")}>
          <div className="card-top">👨‍🎓 Sinh viên</div>
          <div className="card-num">{(studentCount ?? stats.students.value).toLocaleString()}</div>
          <div className="card-sub">{typeof studentDelta === 'number' ? `${studentDelta >= 0 ? '+' : ''}${studentDelta.toLocaleString()} so với tháng trước` : stats.students.delta}</div>
          <div className="spark" aria-hidden>
            <svg width="120" height="36" viewBox="0 0 120 36">
              <polyline fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2" points="0,28 20,30 40,18 60,22 80,10 100,14 120,8" />
            </svg>
          </div>
        </div>
        <div className="card stat-card" onClick={() => onCardClick("lecturers")}>
          <div className="card-top">👩‍🏫 Giảng viên</div>
          <div className="card-num">{(lecturerCount ?? stats.lecturers.value).toLocaleString()}</div>
          <div className="card-sub">{typeof lecturerDelta === 'number' ? `${lecturerDelta >= 0 ? '+' : ''}${lecturerDelta.toLocaleString()} so với tháng trước` : ''}</div>
        </div>
        <div className="card stat-card" onClick={() => onCardClick("classes")}>
          <div className="card-top">🏫 Lớp học</div>
          <div className="card-num">{stats.classes.value.toLocaleString()}</div>
        </div>
        <div className="card stat-card" onClick={() => onCardClick("sessionsToday")}>
          <div className="card-top">📅 Buổi học hôm nay</div>
          <div className="card-num">{stats.sessionsToday.value.toLocaleString()}</div>
        </div>
      </section>

      {/* B. Charts Row */}
      <section className="charts">
        <div className="panel">
          <div className="panel-head">Tổng quan học kỳ</div>
          <div className="bar-wrap">
            {semesters.map((s, idx) => {
              const v = barData[idx];
              const h = Math.max(6, Math.round((v / maxBar) * 180));
              const active = selectedSemester === s;
              return (
                <div key={s} className={`bar-col ${active ? "active" : ""}`} onClick={() => setSelectedSemester(active ? null : s)} title={`$${s}: ${v} sinh viên`.replace("$", "")}> 
                  <div className="bar" style={{ height: h }} />
                  <div className="bar-x">{s}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">Tỉ lệ thành phần</div>
          <div className="donut-wrap">
            <svg viewBox="0 0 36 36" className="donut">
              <circle className="donut-ring" cx="18" cy="18" r="15.915" fill="transparent" stroke="#e5e7eb" strokeWidth="3" />
              {cumulative.map((seg, i) => (
                <circle key={i} cx="18" cy="18" r="15.915" fill="transparent" stroke={seg.color} strokeWidth="3" strokeDasharray={`${seg.len} ${donutStroke - seg.len}`} strokeDashoffset={-seg.start} />
              ))}
            </svg>
            <div className="donut-center">
              <div className="donut-total">Tổng</div>
              <div className="donut-number">{totalUsers.toLocaleString()} người</div>
            </div>
            <div className="legend">
              {donutParts.map((p) => (
                <div key={p.label} className="legend-item">
                  <span className="dot" style={{ background: p.color }} />
                  <span>{p.label}</span>
                  <strong>{Math.round(p.value * 100)}%</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* C. Activity Log */}
      <section className="activity">
        <div className="panel">
          <div className="panel-head">Hoạt động gần đây</div>
          <div className="table">
            <div className="thead">
              <div>Thời gian</div>
              <div>Hành động</div>
              <div>Người thực hiện</div>
            </div>
            <div className="tbody">
              {activity.slice(0, 6).map((row) => (
                <div className="trow" key={row.id} onClick={() => setModal(row)}>
                  <div>{row.time}</div>
                  <div>{row.action}</div>
                  <div>{row.actor}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel-foot">
            <button className="link-btn" onClick={() => alert("Đi tới trang nhật ký hệ thống")}>Xem tất cả</button>
          </div>
        </div>
      </section>

      {modal && (
        <div className="modal" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="title">Chi tiết hoạt động</div>
              <button className="icon-btn" onClick={() => setModal(null)}>✖</button>
            </div>
            <div className="modal-body">
              <div className="kv"><span className="k">Thời gian</span><span className="v">{modal.time}</span></div>
              <div className="kv"><span className="k">Hành động</span><span className="v">{modal.action}</span></div>
              <div className="kv"><span className="k">Người thực hiện</span><span className="v">{modal.actor}</span></div>
              {modal.detail && <div className="kv"><span className="k">Chi tiết</span><span className="v">{modal.detail}</span></div>}
            </div>
            <div className="modal-foot">
              <button className="qr-btn" onClick={() => setModal(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

