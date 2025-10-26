"use client";

import Link from "next/link";
import QRButton from "@/app/components/QRButton";
import { useState, useEffect, useMemo } from "react";

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
  date: string;
  type: string;
}

interface StudentInfo {
  student_id: string;
  full_name: string;
  course: string;
  classes: string[];
}

export default function ThongBaoPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const todayStr = useMemo(() => {
    const now = new Date();
    const weekday = ["Chủ nhật","Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy"][now.getDay()];
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yyyy = now.getFullYear();
    return `${weekday}, ${dd}/${mm}/${yyyy}`;
  }, []);

  const studentId = (() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem("sas_user");
      if (!raw) return "";
      const u = JSON.parse(raw);
      if (u?.role === "student" && typeof u?.userId === "string") return u.userId;
      return "";
    } catch { return ""; }
  })();

  useEffect(() => {
    if (studentId) fetchData();
    const saved = localStorage.getItem('sas_settings');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        document.documentElement.style.colorScheme = s.themeDark ? 'dark' : 'light';
      } catch {}
    }
    const handler = (e: any) => {
      const s = e?.detail;
      if (!s) return;
      document.documentElement.style.colorScheme = s.themeDark ? 'dark' : 'light';
    };
    window.addEventListener('sas_settings_changed' as any, handler);
    return () => window.removeEventListener('sas_settings_changed' as any, handler);
  }, [studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch announcements
      const announcementsResponse = await fetch('http://localhost:8080/api/thongbao/announcements');
      const announcementsData = await announcementsResponse.json();

      if (announcementsData.success) {
        setAnnouncements(announcementsData.data);
      } else {
        throw new Error(announcementsData.message);
      }

      // Fetch student info
      const studentResponse = await fetch(`http://localhost:8080/api/thongbao/students/${studentId}`);
      const studentData = await studentResponse.json();

      if (studentData.success) {
        setStudentInfo(studentData.data);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleAnnouncementClick = async (announcement: Announcement) => {
    try {
      const response = await fetch(`http://localhost:8080/api/thongbao/announcements/${announcement.id}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedAnnouncement(data.data);
      }
    } catch (err) {
      console.error('Error fetching announcement details:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="side-header">
          <button className="collapse-btn" onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
            {collapsed ? '⮞' : '⮜'}
          </button>
          <div className="side-name">
            Chào mừng,<br />
            {studentInfo?.full_name || "Sinh viên"}
          </div>
        </div>
        <nav className="side-nav">
          <Link href="/tongquan_sv" className="side-link">🏠 Trang tổng quan</Link>
          <div className="side-link active">🔔 Thông báo</div>
          <Link href="/lichhoc_sv" className="side-link">📅 Lịch học</Link>
          <Link href="/lichsu_sv" className="side-link">🕘 Lịch sử</Link>
          <Link href="/caidat_sv" className="side-link">⚙️ Cài đặt</Link>
        </nav>
      </aside>
      <header className="topbar">
        <div className="welcome">
          <div className="hello">Xin chào, {studentInfo?.full_name || "Sinh viên"} 👋</div>
          <div className="date">Hôm nay: {todayStr}</div>
        </div>
        <div className="controls">
          <button className="qr-btn">📷 Quét QR</button>
          <button className="qr-btn" onClick={() => { 
          if (confirm('Bạn có chắc muốn đăng xuất?')) {
            localStorage.removeItem('sas_user'); 
            window.location.href = '/login'; 
          }
        }}>🚪 Đăng xuất</button>
        </div>
      </header>
      <main className="main">
        {children}
      </main>
    </div>
  );

  if (loading) {
    return (
      <Shell>
        <div className="container">
          <div className="card">
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Đang tải thông báo...</p>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="container">
          <div className="card">
            <div className="error">
              <div className="error-icon">⚠️</div>
              <p>{error}</p>
              <button onClick={fetchData} className="retry-btn">Thử lại</button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="container">
        {announcements.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-icon">📢</div>
            <p>Chưa có thông báo nào</p>
          </div>
        ) : (
          <ul className="notifications">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="notification-item" onClick={() => handleAnnouncementClick(announcement)}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "#E0F2FE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0369A1",
                  fontSize: 20,
                  fontWeight: 800
                }}>🗓️</div>
                <div className="notif-body">
                  <div className="notif-title">{announcement.title}</div>
                  <div className="notif-preview">{announcement.content}</div>
                </div>
                <div>
                  <div className="notif-time">{formatDate(announcement.created_at)}</div>
                  <div className="notif-arrow" style={{ textAlign: "right", marginTop: 8 }}>View</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedAnnouncement && (
        <div className="modal-overlay" onClick={() => setSelectedAnnouncement(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedAnnouncement.title}</h2>
              <button className="close-btn" onClick={() => setSelectedAnnouncement(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-date">Ngày đăng: {formatDate(selectedAnnouncement.created_at)}</div>
              <div className="modal-content-text">{selectedAnnouncement.content}</div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
