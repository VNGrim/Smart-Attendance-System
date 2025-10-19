"use client";

import Link from "next/link";
import QRButton from "@/app/components/QRButton";
import { useState, useEffect } from "react";

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
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

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

      // Fetch student info (using SV001 as example)
      const studentResponse = await fetch('http://localhost:8080/api/thongbao/students/SV001');
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
    <div className="layout">
      <aside className="sidebar">
        <div className="side-header">
          <img src="/avatar.png" alt="avatar" width={44} height={44} style={{ borderRadius: 9999 }} />
          <div className="side-name">{studentInfo?.full_name || "Sinh viên"}</div>
        </div>
        <nav className="side-nav">
          <div className="side-link active">🔔 Thông báo</div>
          <Link href="/lichhoc_sv" className="side-link">📅 Lịch học</Link>
          <Link href="/lichsu_sv" className="side-link">🕘 Lịch sử</Link>
          <a className="side-link" href="#">⚙️ Cài đặt</a>
        </nav>
      </aside>
      <header className="topbar">
        <button className="qr-btn">📷 Scan QR</button>
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
