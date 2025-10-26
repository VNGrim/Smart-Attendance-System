"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ClassInfo = { id: string; code: string; subject: string };
type AttendanceRow = { id: string; name: string; time?: string; present: boolean };
type HistoryItem = { date: string; slot: number; ratio: string; note?: string };
type Mode = "qr" | "code" | "manual";

export default function LecturerAttendancePage() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount] = useState(2);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [cls, setCls] = useState<string>("");
  const [slot, setSlot] = useState<string>("1");
  const [mode, setMode] = useState<Mode>("qr");
  const [duration, setDuration] = useState<number>(10);
  const [note, setNote] = useState("");
  const [code, setCode] = useState<string>("");
  const [sessionActive, setSessionActive] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  const [students, setStudents] = useState<AttendanceRow[]>([]);
  const [filter, setFilter] = useState<"all"|"present"|"absent">("all");

  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const list: ClassInfo[] = [
      { id: "CN201", code: "CN201", subject: ".NET" },
      { id: "CN202", code: "CN202", subject: "CSDL" },
      { id: "CN203", code: "CN203", subject: "CTDL" },
    ];
    setClasses(list);
    setCls(list[0].id);
    const mockSt = Array.from({ length: 50 }).map((_, i) => ({ id: `SV${(i+1).toString().padStart(3,'0')}`, name: `Sinh viên ${i+1}`, present: i % 3 !== 0, time: i % 3 !== 0 ? `08:${(3+i).toString().padStart(2,'0')}` : undefined }));
    setStudents(mockSt);
    setHistory([
      { date: "20/10", slot: 1, ratio: "90%", note: "Ok" },
      { date: "23/10", slot: 2, ratio: "88%", note: "5 bạn vắng có phép" },
    ]);
  }, []);

  useEffect(() => {
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
    if (!sessionActive || !expiresAt) return;
    const t = setInterval(() => {
      if (Date.now() > expiresAt) {
        setSessionActive(false);
        setExpiresAt(null);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [sessionActive, expiresAt]);

  const timeLeft = useMemo(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  }, [expiresAt, sessionActive]);

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

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let c = "";
    for (let i=0; i<6; i++) c += chars[Math.floor(Math.random()*chars.length)];
    setCode(c);
    setSessionActive(true);
    setExpiresAt(Date.now() + duration * 60 * 1000);
  };

  const filtered = useMemo(() => {
    if (filter === "present") return students.filter(s => s.present);
    if (filter === "absent") return students.filter(s => !s.present);
    return students;
  }, [students, filter]);

  const exportCsv = () => {
    const header = ["MaSV","HoTen","ThoiGian","TrangThai"];
    const rows = filtered.map(s => [s.id, s.name, s.time||"", s.present?"Co mat":"Vang"]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${cls}-attendance.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const endSession = () => {
    setSessionActive(false);
    setExpiresAt(null);
    alert('Đã kết thúc buổi điểm danh (mock)');
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
          <Link href="/diemdanh_gv" className="side-link active">🧍‍♂️ {!collapsed && "Điểm danh"}</Link>
          <Link href="/caidat_gv" className="side-link">⚙️ {!collapsed && "Cài đặt"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="page-title">Điểm danh</div>
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
          <div className="section-title">Tạo buổi điểm danh</div>
          <div className="form">
            <div className="kv"><div className="k">Chọn lớp</div>
              <select className="input" value={cls} onChange={(e)=>setCls(e.target.value)}>
                {classes.map(c => <option key={c.id} value={c.id}>{c.code} – {c.subject}</option>)}
              </select>
            </div>
            <div className="kv"><div className="k">Chọn slot/buổi</div>
              <select className="input" value={slot} onChange={(e)=>setSlot(e.target.value)}>
                <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option>
              </select>
            </div>
            <div className="kv"><div className="k">Hình thức</div>
              <div className="seg">
                <button className={`seg-btn ${mode==='qr'?'active':''}`} onClick={()=>setMode('qr')}>QR code</button>
                <button className={`seg-btn ${mode==='code'?'active':''}`} onClick={()=>setMode('code')}>Nhập mã</button>
                <button className={`seg-btn ${mode==='manual'?'active':''}`} onClick={()=>setMode('manual')}>Thủ công</button>
              </div>
            </div>
            <div className="kv"><div className="k">Thời lượng hiệu lực</div>
              <select className="input" value={duration} onChange={(e)=>setDuration(parseInt(e.target.value))}>
                <option value={5}>5 phút</option>
                <option value={10}>10 phút</option>
                <option value={15}>15 phút</option>
                <option value={20}>20 phút</option>
              </select>
            </div>
            <div className="kv"><div className="k">Ghi chú</div>
              <input className="input" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Ghi chú (tuỳ chọn)" />
            </div>
            <div className="actions">
              <button className="btn-primary" onClick={generateCode}>🧾 Tạo mã điểm danh</button>
            </div>
          </div>

          {sessionActive && (
            <div className="session-box">
              <div className="qr-preview">
                <div className="qr-box">QR</div>
                <div className="qr-meta">
                  <div className="big-code">{code}</div>
                  <div className="time-left">Còn lại: {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
                </div>
              </div>
              <div className="actions end">
                <button className="btn-outline" onClick={exportCsv}>Xuất Excel</button>
                <button className="btn-danger" onClick={endSession}>Kết thúc buổi điểm danh</button>
              </div>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="section-title">Danh sách điểm danh</div>
          <div className="row-actions">
            <div className="seg">
              <button className={`seg-btn ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>Tất cả</button>
              <button className={`seg-btn ${filter==='present'?'active':''}`} onClick={()=>setFilter('present')}>Đã điểm danh</button>
              <button className={`seg-btn ${filter==='absent'?'active':''}`} onClick={()=>setFilter('absent')}>Chưa điểm danh</button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã SV</th>
                  <th>Họ tên</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.name}</td>
                    <td>{s.time||"—"}</td>
                    <td>{s.present?"✅":"❌"} {s.present?"":"Chưa điểm danh"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="section-title">Lịch sử điểm danh</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Slot</th>
                <th>Tỉ lệ tham dự</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h,i)=> (
                <tr key={i}>
                  <td>{h.date}</td>
                  <td>{h.slot}</td>
                  <td>{h.ratio}</td>
                  <td>{h.note||""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

