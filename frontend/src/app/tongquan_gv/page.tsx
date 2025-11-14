"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MiniClass = { id: string; classId: string; subjectCode: string; subjectName: string; time: string; room: string; slot: number; date: string };
type DaySchedule = { date: string; dayName: string; classes: MiniClass[] };
type ThreeDaysData = { yesterday: DaySchedule; today: DaySchedule; tomorrow: DaySchedule };
type NoteItem = { id: string; title: string; from: string; date: string; allowReply?: boolean };

type SettingsEventDetail = { themeDark: boolean };
const SETTINGS_CHANGED_EVENT = "sas_settings_changed";
const API_BASE = "http://localhost:8080/api";

export default function LecturerDashboardPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(true);
  const [notifCount] = useState(3);
  const [name, setName] = useState("Giảng viên");

  const [stats, setStats] = useState({ classes: 0, sessionsToday: 0, students: 0, notifications: 0 });
  const [threeDays, setThreeDays] = useState<ThreeDaysData | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [latestNote, setLatestNote] = useState<NoteItem | null>(null);
  const [attendanceNote, setAttendanceNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Lấy thông tin user từ localStorage
        const userStr = localStorage.getItem("sas_user");
        if (!userStr) {
          router.push("/login");
          return;
        }
  const user = JSON.parse(userStr);
  // Ưu tiên lấy tên thật từ full_name hoặc fullName
  const lecturerName = user.full_name || user.fullName || user.name || user.teacherName || "Giảng viên";
  setName(lecturerName);

        // Gọi API song song
        const [statsRes, threeDaysRes, notificationsRes, latestNotifRes, attendanceRes] = await Promise.all([
          fetch(`${API_BASE}/teacher/dashboard/stats`, { credentials: "include" }),
          fetch(`${API_BASE}/teacher/dashboard/three-days`, { credentials: "include" }),
          fetch(`${API_BASE}/teacher/dashboard/notifications`, { credentials: "include" }),
          fetch(`${API_BASE}/teacher/dashboard/latest-notification`, { credentials: "include" }),
          fetch(`${API_BASE}/teacher/dashboard/attendance-note`, { credentials: "include" }),
        ]);

        if (statsRes.ok) {
          const res = await statsRes.json();
          if (res.success && res.data) {
            setStats({
              classes: res.data.classes || 0,
              sessionsToday: res.data.sessionsToday || 0,
              students: res.data.students || 0,
              notifications: res.data.notifications || 0,
            });
          }
        }

        if (threeDaysRes.ok) {
          const res = await threeDaysRes.json();
          if (res.success && res.data) {
            setThreeDays(res.data);
          }
        }

        if (notificationsRes.ok) {
          const res = await notificationsRes.json();
          if (res.success && res.data) {
            // Map danh sách để có allowReply (nếu BE trả về)
            const list = (res.data as any[]).map((n) => ({ id: n.id, title: n.title, from: n.from, date: n.date, allowReply: n.allowReply })) as NoteItem[];
            setNotes(list);
          }
        }

        if (latestNotifRes.ok) {
          const res = await latestNotifRes.json();
          if (res.success) {
            const n = res.data as { id: string; title: string; from: string; date: string; allowReply?: boolean } | null;
            const mapped = n ? { id: n.id, title: n.title, from: n.from, date: n.date, allowReply: !!n.allowReply } : null;
            setLatestNote(mapped);
          }
        }

        if (attendanceRes.ok) {
          const res = await attendanceRes.json();
          if (res.success && res.data) {
            setAttendanceNote(res.data);
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    try {
      const saved = localStorage.getItem("sas_settings");
      if (saved) {
        const s = JSON.parse(saved);
        const darkTheme = s.themeDark ?? true;
        setDark(darkTheme);
        document.documentElement.classList.toggle("dark-theme", darkTheme);
        document.documentElement.classList.toggle("light-theme", !darkTheme);
      }
    } catch {}
  }, [router]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    try {
      const saved = localStorage.getItem("sas_settings");
      const prev = saved ? JSON.parse(saved) : {};
      const merged = { ...prev, themeDark: next };
      localStorage.setItem("sas_settings", JSON.stringify(merged));
      document.documentElement.classList.toggle("dark-theme", next);
      document.documentElement.classList.toggle("light-theme", !next);
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
      setDark(detail.themeDark);
      document.documentElement.classList.toggle("dark-theme", detail.themeDark);
      document.documentElement.classList.toggle("light-theme", !detail.themeDark);
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
  }, []);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className={`layout ${collapsed ? "collapsed" : ""} ${dark ? '' : 'light-theme'}`}>
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
          <div className="hello">Xin chào, {name} 👋</div>
          <div className="date">{dateStr}</div>
        </div>
        <div className="controls">
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
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px' }}>Đang tải...</div>
      ) : (
        <>
          <section className="cards">
            <div className="card"><div className="card-title">🏫 Lớp đang dạy</div><div className="card-num">{stats.classes}</div></div>
            <div className="card"><div className="card-title">📅 Buổi dạy hôm nay</div><div className="card-num">{stats.sessionsToday}</div></div>
            <div className="card"><div className="card-title">👨‍🎓 Tổng sinh viên</div><div className="card-num">{stats.students}</div></div>
            <div className="card"><div className="card-title">📢 Thông báo mới</div><div className="card-num">{stats.notifications}</div></div>
          </section>

          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="section-title">Lịch dạy gần nhất</div>
            {threeDays ? (
              <div className="three-days-grid">
                {/* Hôm qua */}
                <div className="day-col">
                  <div className="day-header past">
                    <div className="day-label">Hôm qua</div>
                    <div className="day-date">{threeDays.yesterday.dayName} • {threeDays.yesterday.date}</div>
                  </div>
                  <div className="day-classes">
                    {threeDays.yesterday.classes.length === 0 ? (
                      <div className="no-class">Không có lịch</div>
                    ) : (
                      threeDays.yesterday.classes.map(c => (
                        <div key={c.id} className="class-card" onClick={() => router.push('/lichday_gv')}>
                          <div className="class-code">{c.subjectCode}</div>
                          <div className="class-time">{c.time} <span style={{color:'#64748b',fontSize:12}}>(Slot {c.slot})</span></div>
                          {/* <div className="class-room">Phòng {c.room}</div> */}
                          {/* <div className="class-date">Ngày: {c.date}</div> */}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Hôm nay */}
                <div className="day-col">
                  <div className="day-header today">
                    <div className="day-label">Hôm nay</div>
                    <div className="day-date">{threeDays.today.dayName} • {threeDays.today.date}</div>
                  </div>
                  <div className="day-classes">
                    {threeDays.today.classes.length === 0 ? (
                      <div className="no-class">Không có lịch</div>
                    ) : (
                      threeDays.today.classes.map(c => (
                        <div key={c.id} className="class-card" onClick={() => router.push('/lichday_gv')}>
                          <div className="class-code">{c.subjectCode}</div>
                          <div className="class-time">{c.time} <span style={{color:'#64748b',fontSize:12}}>(Slot {c.slot})</span></div>
                          {/* <div className="class-room">Phòng {c.room}</div> */}
                          {/* <div className="class-date">Ngày: {c.date}</div> */}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Ngày mai */}
                <div className="day-col">
                  <div className="day-header future">
                    <div className="day-label">Ngày mai</div>
                    <div className="day-date">{threeDays.tomorrow.dayName} • {threeDays.tomorrow.date}</div>
                  </div>
                  <div className="day-classes">
                    {threeDays.tomorrow.classes.length === 0 ? (
                      <div className="no-class">Không có lịch</div>
                    ) : (
                      threeDays.tomorrow.classes.map(c => (
                        <div key={c.id} className="class-card" onClick={() => router.push('/lichday_gv')}>
                          <div className="class-code">{c.subjectCode}</div>
                          <div className="class-time">{c.time} <span style={{color:'#64748b',fontSize:12}}>(Slot {c.slot})</span></div>
                          {/* <div className="class-room">Phòng {c.room}</div> */}
                          {/* <div className="class-date">Ngày: {c.date}</div> */}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Đang tải lịch...</div>
            )}
          </div>

          <div className="grid2" style={{ marginTop: 12 }}>
            <div className="panel">
              <div className="section-title">Thông báo gần nhất</div>
              <div className="list">
                {!(latestNote || notes[0]) ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Chưa có thông báo mới</div>
                ) : (
                  <div
                    key={(latestNote || notes[0])!.id}
                    className="row"
                    onClick={() => router.push('/thongbao_gv')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="left">
                      <div className="primary">🔔 {(latestNote || notes[0])!.title}</div>
                      <div className="muted">{(latestNote || notes[0])!.from}</div>
                    </div>
                    <div className="right">
                      {(latestNote || notes[0])!.date}
                      {(latestNote || notes[0])!.allowReply ? <span title="Cho phép phản hồi" style={{ marginLeft: 8 }}>↩</span> : null}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="section-title">Điểm danh gần nhất</div>
              <div className="attendance-note">{attendanceNote}</div>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}

