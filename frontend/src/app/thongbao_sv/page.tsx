"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetchJson } from "../../lib/authClient";

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
  date: string;
  type: string;
  sender?: string;
  target?: string;
  allowReply?: boolean;
  replyUntil?: string | null;
}

interface StudentInfo {
  student_id: string;
  full_name: string;
  course: string;
  classes: string[];
}

interface ApiSuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

type AnnouncementsResponse = ApiSuccessResponse<Announcement[]>;
type AnnouncementDetailResponse = ApiSuccessResponse<Announcement>;
type StudentInfoResponse = ApiSuccessResponse<StudentInfo>;

type SasSettings = { themeDark?: boolean };
type SettingsEventDetail = { themeDark: boolean };

const SETTINGS_CHANGED_EVENT = "sas_settings_changed";

export default function ThongBaoPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [replyTarget, setReplyTarget] = useState<Announcement | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [themeDark, setThemeDark] = useState(true);
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

  const applyTheme = useCallback((darkMode: boolean) => {
    setThemeDark(darkMode);
    document.documentElement.classList.toggle("dark-theme", darkMode);
    document.documentElement.classList.toggle("light-theme", !darkMode);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch announcements
      const announcementsData = await apiFetchJson<AnnouncementsResponse>("/api/thongbao/announcements");

      if (announcementsData.success) {
        setAnnouncements(announcementsData.data);
      } else {
        throw new Error(announcementsData.message);
      }

      // Fetch student info
      const studentData = await apiFetchJson<StudentInfoResponse>(`/api/thongbao/students/${studentId}`);

      if (studentData.success) {
        setStudentInfo(studentData.data);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    fetchData().catch(() => {});
  }, [fetchData, studentId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sas_settings");
      if (saved) {
        const s: SasSettings = JSON.parse(saved);
        applyTheme(s.themeDark ?? true);
      }
    } catch {}

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SettingsEventDetail>).detail;
      if (!detail) return;
      applyTheme(detail.themeDark);
    };

    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
  }, [applyTheme]);

  const handleAnnouncementClick = async (announcement: Announcement) => {
    try {
      const data = await apiFetchJson<AnnouncementDetailResponse>(`/api/thongbao/announcements/${announcement.id}`);

      if (data.success) {
        setSelectedAnnouncement(data.data);
      }
    } catch (err) {
      console.error('Error fetching announcement details:', err);
    }
  };

  const canStudentReply = (announcement: Announcement) => {
    if (!announcement.allowReply) return false;
    if (announcement.replyUntil) {
      const deadline = new Date(announcement.replyUntil).getTime();
      if (!Number.isNaN(deadline) && deadline < Date.now()) return false;
    }
    const sender = announcement.sender?.toLowerCase() ?? "";
    const target = announcement.target?.toLowerCase() ?? "";
    const fromAdmin = sender.includes("admin");
    const fromLecturer = sender.includes("giảng viên") || sender.includes("teacher") || sender.includes("lecturer");
    const toStudents = target.includes("sinh viên") || target.includes("student");
    return (fromAdmin || fromLecturer) && toStudents;
  };

  const startReply = (announcement: Announcement) => {
    if (!canStudentReply(announcement)) return;
    setReplyTarget(announcement);
    setReplyMessage("");
    setReplyError(null);
    setSendingReply(false);
  };

  const handleReplyClick = (event: React.MouseEvent<HTMLButtonElement>, announcement: Announcement) => {
    event.stopPropagation();
    startReply(announcement);
  };

  const closeReplyModal = () => {
    setReplyTarget(null);
    setReplyMessage("");
    setReplyError(null);
    setSendingReply(false);
  };

  const submitReply = async () => {
    if (!replyTarget) return;
    const trimmed = replyMessage.trim();
    if (!trimmed) {
      setReplyError("Vui lòng nhập nội dung phản hồi");
      return;
    }

    try {
      setSendingReply(true);
      await apiFetchJson(`/api/thongbao/announcements/${replyTarget.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      alert("Đã gửi phản hồi thành công");
      closeReplyModal();
    } catch (err) {
      console.error("send reply error", err);
      setReplyError(err instanceof Error ? err.message : "Gửi phản hồi thất bại");
    } finally {
      setSendingReply(false);
    }
  };

  const formatReplyDeadline = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <Link href="/tongquan_sv" className="side-link">🏠 {!collapsed && "Trang tổng quan"}</Link>
          <div className="side-link active">🔔 {!collapsed && "Thông báo"}</div>
          <Link href="/lichhoc_sv" className="side-link">📅 {!collapsed && "Lịch học"}</Link>
          <Link href="/lichsu_sv" className="side-link">🕘 {!collapsed && "Lịch sử"}</Link>
          <Link href="/caidat_sv" className="side-link">⚙️ {!collapsed && "Cài đặt"}</Link>
        </nav>
      </aside>
      <header className="topbar">
        <div className="welcome">
          <div className="hello">Xin chào, {studentInfo?.full_name || "Sinh viên"} 👋</div>
          <div className="date">Hôm nay: {todayStr}</div>
        </div>
        <div className="controls">
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
                  <div className="notif-actions">
                    <span className="notif-arrow">View</span>
                    {canStudentReply(announcement) && (
                      <button
                        className="reply-btn"
                        onClick={(event) => handleReplyClick(event, announcement)}
                      >↩ Reply</button>
                    )}
                  </div>
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
              {canStudentReply(selectedAnnouncement) && (
                <div className="modal-date" style={{ color: '#0369a1' }}>
                  {selectedAnnouncement.replyUntil
                    ? `Hạn phản hồi: ${formatReplyDeadline(selectedAnnouncement.replyUntil)}`
                    : 'Thông báo cho phép phản hồi'}
                </div>
              )}
              <div className="modal-content-text">{selectedAnnouncement.content}</div>
            </div>
            {canStudentReply(selectedAnnouncement) && (
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="reply-btn"
                  onClick={() => startReply(selectedAnnouncement)}
                >↩ Trả lời</button>
              </div>
            )}
          </div>
        </div>
      )}

      {replyTarget && (
        <div className="modal-overlay" onClick={closeReplyModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Trả lời thông báo</h2>
              <button className="close-btn" onClick={closeReplyModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-date">Tiêu đề: {replyTarget.title}</div>
              <div className="modal-date">Người gửi: {replyTarget.sender ?? 'Không xác định'}</div>
              {replyTarget.replyUntil && (
                <div className="modal-date" style={{ color: '#0369a1' }}>
                  Hạn phản hồi: {formatReplyDeadline(replyTarget.replyUntil)}
                </div>
              )}
              <textarea
                className="reply-textarea"
                rows={5}
                placeholder="Nhập phản hồi của bạn..."
                value={replyMessage}
                onChange={(e) => {
                  setReplyMessage(e.target.value);
                  if (replyError) setReplyError(null);
                }}
                style={{ marginTop: 12 }}
              />
              {replyError && (
                <div className="reply-error" style={{ color: '#dc2626', marginTop: 8 }}>{replyError}</div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="qr-btn" onClick={closeReplyModal}>Huỷ</button>
              <button className="reply-btn" onClick={submitReply} disabled={sendingReply}>
                {sendingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
