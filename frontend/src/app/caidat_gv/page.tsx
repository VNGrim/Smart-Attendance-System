"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function LecturerSettingsPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount] = useState(1);

  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState("Nguyễn Văn A");
  const [email] = useState("giaovien@example.edu.vn");

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confPwd, setConfPwd] = useState("");

  const [lang, setLang] = useState("Tiếng Việt");
  const [theme, setTheme] = useState<"light"|"dark">("light");
  const [classNotif, setClassNotif] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sas_settings");
      if (saved) {
        const s = JSON.parse(saved);
        setTheme(s.themeDark ? "dark" : "light");
        setDark(!!s.themeDark);
        document.documentElement.style.colorScheme = s.themeDark ? "dark" : "light";
      }
    } catch {}
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    setTheme(next?"dark":"light");
    try {
      const saved = localStorage.getItem("sas_settings");
      const prev = saved ? JSON.parse(saved) : {};
      const merged = { ...prev, themeDark: next };
      localStorage.setItem("sas_settings", JSON.stringify(merged));
      document.documentElement.style.colorScheme = next ? "dark" : "light";
      window.dispatchEvent(new CustomEvent("sas_settings_changed" as any, { detail: merged }));
    } catch {}
  };

  const save = () => {
    if (newPwd && newPwd !== confPwd) { alert("Mật khẩu xác nhận không khớp"); return; }
    setTimeout(()=> alert("Đã lưu thay đổi (mock)"), 300);
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
          <Link href="/lichday_gv" className="side-link">📅 {!collapsed && "Lịch giảng dạy"}</Link>
          <Link href="/lophoc_gv" className="side-link">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/diemdanh_gv" className="side-link">🧍‍♂️ {!collapsed && "Điểm danh"}</Link>
          <Link href="/caidat_gv" className="side-link active">⚙️ {!collapsed && "Cài đặt"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="page-title">Cài đặt</div>
        <div className="controls">
          <button className="icon-btn" onClick={toggleDark}>{dark?"🌙":"🌞"}</button>
          <button className="icon-btn notif">🔔{notifCount>0 && <span className="badge">{notifCount}</span>}</button>
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

  return (
    <Shell>
      <div className="grid2">
        <div className="panel">
          <div className="section-title">Hồ sơ</div>
          <div className="profile">
            <div className="avatar" onClick={()=>document.getElementById('avatar-input')?.click()}>
              {avatar ? <img src={avatar} alt="avatar" /> : "👤"}
            </div>
            <input id="avatar-input" type="file" accept="image/*" style={{ display:'none' }} onChange={(e)=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>setAvatar(r.result as string); r.readAsDataURL(f); }} />
            <div className="kv"><div className="k">Họ tên</div><input className="input" value={name} onChange={(e)=>setName(e.target.value)} /></div>
            <div className="kv"><div className="k">Email</div><input className="input" value={email} disabled /></div>
          </div>
        </div>

        <div className="panel">
          <div className="section-title">Đổi mật khẩu</div>
          <div className="form">
            <input className="input" type="password" placeholder="Mật khẩu hiện tại" value={curPwd} onChange={(e)=>setCurPwd(e.target.value)} />
            <input className="input" type="password" placeholder="Mật khẩu mới" value={newPwd} onChange={(e)=>setNewPwd(e.target.value)} />
            <input className="input" type="password" placeholder="Nhập lại mật khẩu mới" value={confPwd} onChange={(e)=>setConfPwd(e.target.value)} />
            <div className="hint">Tối thiểu 8 ký tự, có số & ký tự đặc biệt.</div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="section-title">Tuỳ chọn</div>
        <div className="grid2">
          <div className="form">
            <div className="kv"><div className="k">Ngôn ngữ</div>
              <select className="input" value={lang} onChange={(e)=>setLang(e.target.value)}>
                <option>Tiếng Việt</option>
                <option>English</option>
              </select>
            </div>
            <div className="kv"><div className="k">Chế độ hiển thị</div>
              <div className="seg">
                <button className={`seg-btn ${theme==='light'?'active':''}`} onClick={()=>{ setTheme('light'); if(dark) toggleDark(); }}>Light</button>
                <button className={`seg-btn ${theme==='dark'?'active':''}`} onClick={()=>{ setTheme('dark'); if(!dark) toggleDark(); }}>Dark</button>
              </div>
            </div>
          </div>
          <div className="form">
            <div className="kv"><div className="k">Thông báo lớp học</div>
              <label className="switch">
                <input type="checkbox" checked={classNotif} onChange={(e)=>setClassNotif(e.target.checked)} />
                <span className="slider" />
              </label>
            </div>
            <div className="actions">
              <button className="btn-primary" onClick={save}>Lưu thay đổi</button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

