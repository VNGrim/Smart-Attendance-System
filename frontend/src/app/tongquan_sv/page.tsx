"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import QRCodeScanner from "../components/QRCodeScanner";
import { apiFetchJson } from "../../lib/authClient";
import { makeApiUrl } from "../../lib/apiBase";

type Student = { id: string; name: string };
type Stat = { icon: string; title: string; value: string; color: string; href: string };
type ScheduleItem = { day: string; time: string; subject: string; room: string; status: "ongoing"|"upcoming"|"done" };
type Announcement = { id: number; title: string; sender: string; date: string; type: "teacher"|"school"; content: string };
type ProgressItem = { subject: string; percent: number; note?: string };
type AttendanceItem = { subject: string; date: string; slot: string; present: boolean };
type Assignment = { title: string; due: string; remain: string };

const STUDENT_ATTENDANCE_API = makeApiUrl("/api/student-attendance");

export default function StudentDashboardPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount] = useState(2);
  const [filter, setFilter] = useState<"all"|"teacher"|"school">("all");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [themeDark, setThemeDark] = useState(true);
  // QR Code Scanner State
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [attendanceCode, setAttendanceCode] = useState("");
  const [qrResult, setQrResult] = useState("");
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("sas_user");
    try { if (savedUser) { const u = JSON.parse(savedUser); if (u?.role === 'student') setStudent({ id: u.userId, name: u.fullName || "Sinh viên" }); } } catch {}
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
  const todayStr = useMemo(() => {
    const now = new Date();
    const weekday = ["Chủ nhật","Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy"][now.getDay()];
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yyyy = now.getFullYear();
    return `${weekday}, ${dd}/${mm}/${yyyy}`;
  }, []);

  const handleQRScan = (result: string) => {
    setQrResult(result);
    handleAttendanceSubmit(result);
  };

  const handleCodeSubmit = () => {
    if (!attendanceCode.trim()) {
      alert("Vui lòng nhập mã điểm danh!");
      return;
    }
    handleAttendanceSubmit(attendanceCode);
  };

  const extractCode = (raw: string) => {
    if (!raw) return "";
    const trimmed = raw.trim();
    try {
      const parsedUrl = new URL(trimmed);
      const codeParam = parsedUrl.searchParams.get("code");
      if (codeParam) return codeParam.trim().toUpperCase();
    } catch {
      // not a URL, treat as plain code
    }
    return trimmed.toUpperCase();
  };

  const handleAttendanceSubmit = async (rawCode: string) => {
    const code = extractCode(rawCode);
    if (!code || code.length < 4) {
      setAttendanceMessage({ type: "error", text: "Mã điểm danh không hợp lệ." });
      return;
    }

    setAttendanceLoading(true);
    setAttendanceMessage(null);
    try {
      await apiFetchJson(`${STUDENT_ATTENDANCE_API}/attend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      setAttendanceMessage({ type: "success", text: "✅ Điểm danh thành công!" });
      setShowQRScanner(false);
      setShowCodeInput(false);
      setAttendanceCode("");
      setQrResult("");
    } catch (error: any) {
      console.error("Attendance error:", error);
      setAttendanceMessage({ type: "error", text: error?.message || "❌ Có lỗi xảy ra khi điểm danh." });
    } finally {
      setAttendanceLoading(false);
    }
  };

  const stats: Stat[] = [
    { icon: "🏫", title: "Số lớp đang học", value: "5", color: "stat-blue", href: "/lophoc_sv" },
    { icon: "📅", title: "Buổi học hôm nay", value: "2", color: "stat-yellow", href: "/lichhoc_sv" },
    { icon: "🎯", title: "Tỷ lệ điểm danh", value: "92%", color: "stat-green", href: "/lichsu_sv" },
    { icon: "🧾", title: "Trung bình điểm", value: "8.4 / 10", color: "stat-red", href: "/lichsu_sv" },
  ];

  const schedule: ScheduleItem[] = [
    { day: "Thứ 2", time: "08:00–10:00", subject: "Lập trình .NET", room: "A304", status: "ongoing" },
    { day: "Thứ 3", time: "10:00–12:00", subject: "CSDL nâng cao", room: "B201", status: "upcoming" },
    { day: "Thứ 5", time: "13:00–15:00", subject: "CTDL & GT", room: "B202", status: "upcoming" },
  ];

  const announcements: Announcement[] = [
    { id: 1, title: "Nghỉ học ngày 28/10", sender: "GV. Nguyễn Văn A", date: "26/10", type: "teacher", content: "Lớp .NET nghỉ ngày 28/10 do bận công tác." },
    { id: 2, title: "Nộp bài tập tuần 5", sender: "GV. Lê Thị B", date: "25/10", type: "teacher", content: "Nhớ nộp bài tập tuần 5 trước 23:00, 29/10." },
    { id: 3, title: "Thông báo của trường", sender: "Phòng ĐT", date: "24/10", type: "school", content: "Tuần lễ chào đón doanh nghiệp 01-05/11." },
  ];

  const filteredAnnouncements = announcements.filter(a => filter==='all' ? true : a.type===filter);

  const progresses: ProgressItem[] = [
    { subject: "Lập trình .NET", percent: 80, note: "Còn 2 buổi, 1 bài tập" },
    { subject: "Cơ sở dữ liệu", percent: 60, note: "3 buổi còn lại" },
    { subject: "Cấu trúc dữ liệu", percent: 90, note: "Sắp thi cuối kỳ" },
  ];

  const recents: AttendanceItem[] = [
    { subject: ".NET", date: "25/10", slot: "8", present: true },
    { subject: "CSDL nâng cao", date: "23/10", slot: "6", present: false },
    { subject: "Cấu trúc dữ liệu", date: "22/10", slot: "5", present: true },
  ];

  const assignments: Assignment[] = [
    { title: "Bài tập .NET", due: "29/10", remain: "Còn 2 ngày" },
    { title: "Bài tập CSDL", due: "02/11", remain: "Còn 5 ngày" },
    { title: "Bài tập CTDL", due: "05/11", remain: "Còn 1 tuần" },
  ];

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="side-header">
          <button className="collapse-btn" onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
            {collapsed ? '⮞' : '⮜'}
          </button>
          {!collapsed && <div className="side-name">Xin chào, {student?.name || "Sinh viên"} 👋</div>}
        </div>
        <nav className="side-nav">
          <Link href="/tongquan_sv" className="side-link active">🏠 {!collapsed && "Dashboard"}</Link>
          <Link href="/thongbao_sv" className="side-link">📢 {!collapsed && "Thông báo"}</Link>
          <Link href="/lichhoc_sv" className="side-link">📅 {!collapsed && "Lịch học"}</Link>
          <Link href="/lichsu_sv" className="side-link">🧾 {!collapsed && "Lịch sử"}</Link>
          <Link href="/caidat_sv" className="side-link">⚙️ {!collapsed && "Cài đặt"}</Link>
        </nav>
      </aside>
      <header className="topbar">
        <div className="welcome">
          <div className="hello">Xin chào, {student?.name || "Sinh viên"} 👋</div>
          <div className="date">Hôm nay: {todayStr}</div>
        </div>
        <div className="controls">
          <div className="attendance-dropdown-wrapper">
            <button className="qr-btn primary" onClick={() => {
              // Show dropdown or modal with QR/Code options
              if (confirm('Chọn hình thức điểm danh:\n1. OK = Quét QR Code\n2. Cancel = Nhập mã thủ công')) {
                setShowQRScanner(true);
              } else {
                setShowCodeInput(true);
              }
            }}>📷 Điểm danh ngay</button>
          </div>
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

  return (
    <Shell>
      <div className="dashboard-grid">
        <div className="quick-stats">
          {stats.map((s, i) => (
            <Link key={i} className={`stat ${s.color}`} href={s.href}>
              <div className="icon">{s.icon}</div>
              <div className="meta">
                <div className="title">{s.title}</div>
                <div className="value">{s.value}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="panel">
          <div className="section-title">Lịch học trong tuần</div>
          <div className="schedule-list">
            {schedule.map((c, i) => (
              <div key={i} className={`sched ${c.status}`}>
                <div className="day">{c.day}</div>
                <div className="time">{c.time}</div>
                <div className="subject">{c.subject}</div>
                <div className="room">{c.room}</div>
                <div className="status">{c.status==="ongoing"?"🟢 Đang học": c.status==="upcoming"?"⏳ Sắp diễn ra":""}</div>
              </div>
            ))}
          </div>
          <div className="actions end"><Link href="/lichhoc_sv" className="btn-outline">Xem toàn bộ lịch học</Link></div>
        </div>

        <div className="panel">
          <div className="row-actions">
            <div className="section-title" style={{ marginBottom:0 }}>Thông báo gần nhất</div>
            <div className="seg">
              <button className={`seg-btn ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>Tất cả</button>
              <button className={`seg-btn ${filter==='teacher'?'active':''}`} onClick={()=>setFilter('teacher')}>Từ giảng viên</button>
              <button className={`seg-btn ${filter==='school'?'active':''}`} onClick={()=>setFilter('school')}>Từ nhà trường</button>
            </div>
          </div>
          <div className="list">
            {filteredAnnouncements.map(a => (
              <div key={a.id} className="ann-item" onClick={()=>setSelectedAnnouncement(a)}>
                <div className="ann-title">{a.title}</div>
                <div className="ann-sub">{a.sender}</div>
                <div className="ann-date">{a.date}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-title">Tiến độ học tập</div>
          <div className="progress-list">
            {progresses.map((p,i)=> (
              <div key={i} className="prog-row">
                <div className="prog-subject">{p.subject}</div>
                <div className="prog-bar"><div className={`bar ${p.percent<70?'low':p.percent<85?'mid':'high'}`} style={{ width: `${p.percent}%` }} /></div>
                <div className="prog-note">{p.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-title">Lịch sử điểm danh gần đây</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Môn học</th><th>Ngày</th><th>Slot</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {recents.map((r,i)=> (
                  <tr key={i}><td>{r.subject}</td><td>{r.date}</td><td>Slot {r.slot}</td><td>{r.present?'✅ Có mặt':'❌ Vắng'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="actions end"><Link href="/lichsu_sv" className="btn-outline">Xem toàn bộ lịch sử điểm danh</Link></div>
        </div>

        <div className="widgets">
          <div className="widget big">
            <div className="title">📷 Điểm danh bằng QR hoặc mã</div>
            <div className="sub">Nếu đang trong khung giờ học, hệ thống sẽ gợi ý lớp hiện tại.</div>
            <div className="attendance-buttons">
              <button className="btn-qr-scan" onClick={() => setShowQRScanner(true)} disabled={attendanceLoading}>
                📷 Quét QR
              </button>
              <button className="btn-code-input" onClick={() => setShowCodeInput(true)} disabled={attendanceLoading}>
                🔢 Nhập mã
              </button>
            </div>
            {attendanceMessage && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 12,
                  fontWeight: 700,
                  background: attendanceMessage.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                  color: attendanceMessage.type === "success" ? "#047857" : "#b91c1c",
                }}
              >
                {attendanceMessage.text}
              </div>
            )}
          </div>
          <div className="widget">
            <div className="title">📚 Bài tập & hạn nộp</div>
            <div className="list">
              {assignments.map((a,i)=> (
                <div key={i} className="hw-item">
                  <div className="hw-title">{a.title}</div>
                  <div className="hw-sub">Hạn {a.due} ({a.remain})</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedAnnouncement && (
        <div className="modal-overlay" onClick={()=>setSelectedAnnouncement(null)}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedAnnouncement.title}</h2>
              <button className="close-btn" onClick={()=>setSelectedAnnouncement(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-date">Người gửi: {selectedAnnouncement.sender} – Ngày: {selectedAnnouncement.date}</div>
              <div className="modal-content-text">{selectedAnnouncement.content}</div>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="modal-overlay" onClick={() => setShowQRScanner(false)}>
          <div className="modal-content qr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📷 Quét mã QR</h2>
              <button className="close-btn" onClick={() => setShowQRScanner(false)}>×</button>
            </div>
            <div className="modal-body">
              <QRCodeScanner onResult={handleQRScan} />
              {qrResult && (
                <div className="qr-result">
                  <strong>Kết quả:</strong> {qrResult}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Code Input Modal */}
      {showCodeInput && (
        <div className="modal-overlay" onClick={() => setShowCodeInput(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔢 Nhập mã điểm danh</h2>
              <button className="close-btn" onClick={() => setShowCodeInput(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="code-input-wrapper">
                <input
                  type="text"
                  className="code-input"
                  placeholder="Nhập mã điểm danh (6 ký tự)"
                  value={attendanceCode}
                  onChange={(e) => setAttendanceCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  autoFocus
                />
                  <button className="btn-primary submit-code-btn" onClick={handleCodeSubmit} disabled={attendanceLoading}>
                  {attendanceLoading ? "Đang xử lý..." : "Điểm danh"}
                </button>
              </div>
              {attendanceMessage && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontWeight: 600,
                    background: attendanceMessage.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                    color: attendanceMessage.type === "success" ? "#047857" : "#b91c1c",
                  }}
                >
                  {attendanceMessage.text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

