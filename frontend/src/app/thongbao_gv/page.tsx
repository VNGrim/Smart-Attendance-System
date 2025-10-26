"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TabKey = "inbox" | "send";
type InboxItem = { id: string; title: string; from: string; date: string; content: string; attachments?: string[] };

export default function LecturerNotificationsPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount, setNotifCount] = useState(2);
  const [tab, setTab] = useState<TabKey>("inbox");

  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [detail, setDetail] = useState<InboxItem | null>(null);

  const [classes] = useState(["CN201 - .NET", "CN202 - CSDL", "CN203 - CTDL"]);
  const [toClass, setToClass] = useState("CN201 - .NET");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setInbox([
      { id: "i1", title: "Thông báo họp giáo viên thứ 4", from: "Phòng đào tạo", date: "25/10/2025", content: "Kính mời quý thầy cô tham dự họp vào thứ 4 lúc 14:00 tại phòng A1." },
      { id: "i2", title: "Lịch bảo trì hệ thống LMS", from: "Admin hệ thống", date: "23/10/2025", content: "Hệ thống LMS sẽ bảo trì từ 22:00 đến 23:30, mong thầy cô thông cảm." },
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
          <Link href="/thongbao_gv" className="side-link active">📢 {!collapsed && "Thông báo"}</Link>
          <Link href="/lichday_gv" className="side-link">📅 {!collapsed && "Lịch giảng dạy"}</Link>
          <Link href="/lophoc_gv" className="side-link">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/diemdanh_gv" className="side-link">🧍‍♂️ {!collapsed && "Điểm danh"}</Link>
          <Link href="/caidat_gv" className="side-link">⚙️ {!collapsed && "Cài đặt"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="page-title">Thông báo</div>
        <div className="controls">
          <div className="tabs">
            <button className={`tab ${tab==='inbox'?'active':''}`} onClick={()=>setTab('inbox')}>Nhận thông báo</button>
            <button className={`tab ${tab==='send'?'active':''}`} onClick={()=>setTab('send')}>Gửi thông báo</button>
          </div>
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

  const InboxView = () => (
    <div className="panel">
      <div className="list">
        {inbox.map(i => (
          <div key={i.id} className="card-inbox" onClick={()=>setDetail(i)}>
            <div className="title">🔔 {i.title}</div>
            <div className="meta">{i.from} • {i.date}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const SendView = () => (
    <div className="panel">
      <div className="form">
        <label className="label">Chọn lớp</label>
        <select className="input" value={toClass} onChange={(e)=>setToClass(e.target.value)}>
          {classes.map(c => <option key={c}>{c}</option>)}
        </select>
        <label className="label">Tiêu đề</label>
        <input className="input" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Tiêu đề thông báo" />
        <label className="label">Nội dung</label>
        <textarea className="input" rows={6} value={content} onChange={(e)=>setContent(e.target.value)} placeholder="Nhập nội dung..." />
        <label className="label">File đính kèm</label>
        <input className="input" type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
        <div className="actions">
          <button className="btn-primary" onClick={()=>{ if(!title||!content){ alert('Vui lòng nhập tiêu đề và nội dung'); return;} alert(`Thông báo đã được gửi đến lớp ${toClass}`); setTitle(''); setContent(''); setFile(null); }}>📤 Gửi thông báo</button>
        </div>
      </div>
    </div>
  );

  return (
    <Shell>
      {tab === 'inbox' && <InboxView />}
      {tab === 'send' && <SendView />}

      {detail && (
        <div className="modal" onClick={()=>setDetail(null)}>
          <div className="modal-content small" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="title">{detail.title}</div>
              <button className="icon-btn" onClick={()=>setDetail(null)}>✖</button>
            </div>
            <div className="modal-body">
              <div className="meta">{detail.from} • {detail.date}</div>
              <div style={{marginTop:8}}>{detail.content}</div>
              {detail.attachments && detail.attachments.length>0 && (
                <div style={{marginTop:8}}>
                  {detail.attachments.map((a,i)=>(<div key={i}><a href={a} target="_blank">Tệp đính kèm {i+1}</a></div>))}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="qr-btn" onClick={()=>setDetail(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

