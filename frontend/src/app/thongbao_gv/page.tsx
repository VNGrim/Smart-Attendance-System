"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import type { MouseEvent } from "react";
import { apiFetchJson } from "../../lib/authClient";

type TabKey = "inbox" | "send";
type InboxItem = {
  id: number;
  title: string;
  from: string;
  date: string;
  content: string;
  allowReply?: boolean;
  replyUntil?: string | null;
  attachments?: string[];
};
type Announcement = {
  id: number;
  title: string;
  content: string;
  sender: string;
  date: string;
  dateFormatted: string;
  time: string;
  type: string;
  status: string;
  category: string;
  allowReply?: boolean;
  replyUntil?: string | null;
};

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

type AnnouncementsResponse = ApiResponse<Announcement[]>;
type ReplyPayload = { message: string };

type SasSettings = { themeDark?: boolean };
type SettingsEventDetail = { themeDark: boolean };

const SETTINGS_CHANGED_EVENT = "sas_settings_changed";

interface ReplyModalProps {
  open: boolean;
  target: InboxItem | null;
  message: string;
  sending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
  onMessageChange: (value: string) => void;
  formatReplyDeadline: (value?: string | null) => string | null;
}

const ReplyModal = ({
  open,
  target,
  message,
  sending,
  error,
  onClose,
  onSubmit,
  onMessageChange,
  formatReplyDeadline,
}: ReplyModalProps) => (
  <div
    className="modal"
    style={{ display: open ? "flex" : "none" }}
    onClick={open ? onClose : undefined}
    aria-hidden={!open}
  >
    <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
      <div className="modal-head">
        <div className="title">Trả lời thông báo</div>
        <button className="icon-btn" onClick={onClose}>✖</button>
      </div>
      <div className="modal-body">
        <div className="meta">{target?.title ?? "--"}</div>
        <div style={{ marginTop: 4, fontSize: 13, color: '#475569' }}>Gửi tới: {target?.from ?? 'Không xác định'}</div>
        {target?.replyUntil ? (
          <div style={{ marginTop: 4, fontSize: 12, color: '#0369a1' }}>
            Hạn phản hồi: {formatReplyDeadline(target.replyUntil)}
          </div>
        ) : (
          <div style={{ marginTop: 4, fontSize: 12, color: '#0369a1' }}>
            Thông báo cho phép phản hồi
          </div>
        )}
        <textarea
          className="input"
          rows={5}
          placeholder="Nhập phản hồi của bạn..."
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          style={{ marginTop: 12 }}
        />
        {error && (
          <div style={{ marginTop: 8, color: '#dc2626', fontSize: 13 }}>{error}</div>
        )}
      </div>
      <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="qr-btn" onClick={onClose}>Huỷ</button>
        <button className="btn-primary" onClick={onSubmit} disabled={sending}>
          {sending ? "Đang gửi..." : "Gửi phản hồi"}
        </button>
      </div>
    </div>
  </div>
);

// Top-level Shell to preserve component identity and original UI structure
type ShellProps = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  dark: boolean;
  toggleDark: () => void;
  notifCount: number;
  tab: TabKey;
  setTab: (t: TabKey) => void;
  children: React.ReactNode;
};

const Shell = ({ collapsed, setCollapsed, dark, toggleDark, notifCount, tab, setTab, children }: ShellProps) => (
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

// Top-level InboxView and SendView to avoid remounts and keep original markup
type InboxViewProps = {
  loading: boolean;
  error: string | null;
  inbox: InboxItem[];
  canReply: (item?: { allowReply?: boolean; replyUntil?: string | null }) => boolean;
  formatReplyDeadline: (value?: string | null) => string | null;
  openReplyModal: (item: InboxItem) => void;
  setDetail: (item: InboxItem | null) => void;
};

const InboxView = ({ loading, error, inbox, canReply, formatReplyDeadline, openReplyModal, setDetail }: InboxViewProps) => (
  <div className="panel">
    {loading && (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div>⏳ Đang tải thông báo...</div>
      </div>
    )}
    {error && !loading && (
      <div style={{ textAlign: 'center', padding: '20px', color: '#ef4444' }}>
        <div>⚠️ {error}</div>
      </div>
    )}
    {!loading && !error && (
      <div className="list">
        {inbox.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
            📭 Chưa có thông báo nào
          </div>
        ) : (
          inbox.map(i => (
            <div key={i.id} className="card-inbox" onClick={()=>setDetail(i)}>
              <div className="title">🔔 {i.title}</div>
              <div className="meta">{i.from} • {i.date}</div>
              {canReply(i) && (
                <div className="meta" style={{ fontSize: 12, color: '#0369a1' }}>
                  {i.replyUntil ? `Cho phép phản hồi tới ${formatReplyDeadline(i.replyUntil)}` : 'Cho phép phản hồi'}
                </div>
              )}
              {canReply(i) && (
                <div style={{ marginTop: 8 }}>
                  <button
                    className="qr-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      openReplyModal(i);
                    }}
                  >↩ Phản hồi</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    )}
  </div>
);

type SendViewProps = {
  classes: string[];
  toClass: string;
  setToClass: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
};

const SendView = ({ classes, toClass, setToClass, title, setTitle, content, setContent, file, setFile }: SendViewProps) => (
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
      {file && (
        <div style={{ marginTop: 8, fontSize: 13, color: "#475569" }}>Đã chọn: {file.name}</div>
      )}
      <div className="actions">
        <button className="btn-primary" onClick={()=>{ if(!title||!content){ alert('Vui lòng nhập tiêu đề và nội dung'); return;} alert(`Thông báo đã được gửi đến lớp ${toClass}`); setTitle(''); setContent(''); setFile(null); }}>📤 Gửi thông báo</button>
      </div>
    </div>
  </div>
);

export default function LecturerNotificationsPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [tab, setTab] = useState<TabKey>("inbox");

  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [detail, setDetail] = useState<InboxItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [replyTarget, setReplyTarget] = useState<InboxItem | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);

  const [classes] = useState(["CN201 - .NET", "CN202 - CSDL", "CN203 - CTDL"]);
  const [toClass, setToClass] = useState("CN201 - .NET");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const applyTheme = useCallback((darkMode: boolean) => {
    setDark(darkMode);
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sas_settings");
      if (saved) {
        const s: SasSettings = JSON.parse(saved);
        applyTheme(s.themeDark ?? false);
      }
    } catch {}
  }, [applyTheme]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SettingsEventDetail>).detail;
      if (!detail) return;
      applyTheme(detail.themeDark);
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
  }, [applyTheme]);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetchJson<AnnouncementsResponse>("/api/teacher/notifications/announcements");

      if (result.success && Array.isArray(result.data)) {
        const mappedData: InboxItem[] = result.data.map((item) => ({
          id: item.id,
          title: item.title,
          from: item.sender,
          date: item.dateFormatted || new Date(item.date).toLocaleDateString("vi-VN"),
          content: item.content,
          allowReply: item.allowReply,
          replyUntil: item.replyUntil ?? null,
        }));
        setInbox(mappedData);
        setNotifCount(mappedData.length);
      } else {
        setError(result.message || "Không thể tải thông báo");
      }
    } catch (err) {
      console.error("Error fetching announcements:", err);
      setError(err instanceof Error ? err.message : "Lỗi kết nối đến server");
      setInbox([
        {
          id: 1,
          title: "Thông báo họp giáo viên thứ 4",
          from: "Phòng đào tạo",
          date: "25/10/2025",
          content: "Kính mời quý thầy cô tham dự họp vào thứ 4 lúc 14:00 tại phòng A1.",
          allowReply: false,
        },
        {
          id: 2,
          title: "Lịch bảo trì hệ thống LMS",
          from: "Admin hệ thống",
          date: "23/10/2025",
          content: "Hệ thống LMS sẽ bảo trì từ 22:00 đến 23:30, mong thầy cô thông cảm.",
          allowReply: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements().catch(() => {});
  }, [fetchAnnouncements]);

  const canReply = (item?: { allowReply?: boolean; replyUntil?: string | null }) => {
    if (!item?.allowReply) return false;
    if (!item.replyUntil) return true;
    const deadline = new Date(item.replyUntil).getTime();
    return !Number.isNaN(deadline) && deadline >= Date.now();
  };

  const openReplyModal = (item: InboxItem) => {
    setDetail(null);
    setReplyTarget(item);
    setReplyMessage("");
    setReplyError(null);
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
      await apiFetchJson<ApiResponse<unknown>>(`/api/thongbao/announcements/${replyTarget.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed } satisfies ReplyPayload),
      });
      alert("Đã gửi phản hồi thành công");
      closeReplyModal();
    } catch (err) {
      console.error("submit reply error", err);
      setReplyError(err instanceof Error ? err.message : "Gửi phản hồi thất bại");
    } finally {
      setSendingReply(false);
    }
  };

  const formatReplyDeadline = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    try {
      const saved = localStorage.getItem("sas_settings");
      const prev: SasSettings = saved ? JSON.parse(saved) : {};
      const merged: SasSettings = { ...prev, themeDark: next };
      localStorage.setItem("sas_settings", JSON.stringify(merged));
      document.documentElement.style.colorScheme = next ? "dark" : "light";
      window.dispatchEvent(new CustomEvent<SettingsEventDetail>(SETTINGS_CHANGED_EVENT, { detail: { themeDark: next } }));
    } catch {}
  };

  const handleTabChange = (value: string) => setTab(value === "send" ? "send" : "inbox");

  const renderInboxView = () => {
    if (loading) {
      return (
        <div className="list">
          <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Đang tải thông báo...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="list">
          <div style={{ textAlign: "center", padding: "20px", color: "#ef4444" }}>{error}</div>
        </div>
      );
    }

    return (
      <div className="list">
        {inbox.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>📭 Chưa có thông báo nào</div>
        ) : (
          inbox.map((item) => (
            <div key={item.id} className="card-inbox" onClick={() => setDetail(item)}>
              <div className="title">🔔 {item.title}</div>
              <div className="meta">
                {item.from} • {item.date}
              </div>
              {canReply(item) && (
                <div className="meta" style={{ fontSize: 12, color: "#0369a1" }}>
                  {item.replyUntil
                    ? `Cho phép phản hồi tới ${formatReplyDeadline(item.replyUntil)}`
                    : "Cho phép phản hồi"}
                </div>
              )}
              {canReply(item) && (
                <div style={{ marginTop: 8 }}>
                  <button
                    className="qr-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      openReplyModal(item);
                    }}
                  >
                    ↩ Phản hồi
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  const handleSend = () => {
    if (!title || !content) {
      alert("Vui lòng nhập tiêu đề và nội dung");
      return;
    }
    alert(`Thông báo đã được gửi đến lớp ${toClass}`);
    setTitle("");
    setContent("");
    setFile(null);
  };

  const renderSendView = () => (
    <div className="panel">
      <div className="form">
        <label className="label">Chọn lớp</label>
        <select className="input" value={toClass} onChange={(event) => setToClass(event.target.value)}>
          {classes.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label className="label">Tiêu đề</label>
        <input
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Tiêu đề thông báo"
        />
        <label className="label">Nội dung</label>
        <textarea
          className="input"
          rows={6}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Nhập nội dung..."
        />
        <label className="label">File đính kèm</label>
        <input className="input" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        {file && <div style={{ marginTop: 8, fontSize: 13, color: "#475569" }}>Đã chọn: {file.name}</div>}
        <div className="actions">
          <button className="btn-primary" onClick={handleSend}>
            📤 Gửi thông báo
          </button>
        </div>
      </div>
    </div>
  );

  const renderDetailModal = () => {
    if (!detail) return null;
    return (
      <div className="modal" onClick={() => setDetail(null)}>
        <div className="modal-content small" onClick={(event) => event.stopPropagation()}>
          <div className="modal-head">
            <div className="title">{detail.title}</div>
            <button className="icon-btn" onClick={() => setDetail(null)}>
              ✖
            </button>
          </div>
          <div className="modal-body">
            <div className="meta">
              {detail.from} • {detail.date}
            </div>
            {canReply(detail) && (
              <div style={{ marginTop: 6, color: "#0369a1", fontSize: 13 }}>
                {detail.replyUntil
                  ? `Hạn phản hồi: ${formatReplyDeadline(detail.replyUntil)}`
                  : "Thông báo cho phép phản hồi"}
              </div>
            )}
            <div style={{ marginTop: 8 }}>{detail.content}</div>
            {detail.attachments?.length ? (
              <div style={{ marginTop: 8 }}>
                {detail.attachments.map((attachment, index) => (
                  <div key={index}>
                    <a href={attachment} target="_blank" rel="noreferrer">
                      Tệp đính kèm {index + 1}
                    </a>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="modal-foot" style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            {canReply(detail) && (
              <button className="btn-primary" onClick={() => openReplyModal(detail)}>
                ↩ Trả lời
              </button>
            )}
            <button className="qr-btn" onClick={() => setDetail(null)}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Shell
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      dark={dark}
      toggleDark={toggleDark}
      notifCount={notifCount}
      tab={tab}
      setTab={handleTabChange}
    >
      {tab === "inbox" ? renderInboxView() : renderSendView()}
      {renderDetailModal()}

      <ReplyModal
        open={Boolean(replyTarget)}
        target={replyTarget}
        message={replyMessage}
        sending={sendingReply}
        error={replyError}
        onClose={closeReplyModal}
        onSubmit={submitReply}
        onMessageChange={(value) => {
          setReplyMessage(value);
          if (replyError) setReplyError(null);
        }}
        formatReplyDeadline={formatReplyDeadline}
      />
    </Shell>
  );
}
