"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { makeApiUrl } from "../../lib/apiBase";
import { formatVietnamDate, formatVietnamTime, formatVietnamWeekday } from "../../lib/timezone";

type ClassInfo = {
  id: string;
  code: string;
  name: string;
  subjectName: string;
  subjectCode?: string;
  studentCount: number;
};

type SlotInfo = {
  slotId: number;
  room?: string | null;
  weekKey?: string | null;
  subject?: string | null;
  teacherName?: string | null;
  dayOfWeek?: string | null;
};

type SessionSummary = {
  id: number;
  classId: string;
  slotId: number;
  code: string;
  type: Mode;
  status: "active" | "expired" | "closed";
  attempts: number;
  maxResets: number;
  attemptsRemaining: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SessionDetail = SessionSummary & {
  className?: string;
  subjectName?: string;
  totalStudents?: number;
};

type AttendanceRow = {
  studentId: string;
  fullName: string;
  email?: string | null;
  course?: string | null;
  status: "present" | "absent" | "excused";
  markedAt: string | null;
  note?: string | null;
};

type HistoryItem = {
  id: number;
  day: string;
  slotId: number;
  type: Mode;
  status: string;
  code: string;
  present: number;
  total: number;
  ratio: number;
  createdAt: string;
};

type Mode = "qr" | "code" | "manual";

type Filter = "all" | "present" | "absent" | "excused";

const API_BASE = makeApiUrl("/api/attendances");

const DAY_LABELS: Record<string, string> = {
  Mon: "Thứ 2",
  Tue: "Thứ 3",
  Wed: "Thứ 4",
  Thu: "Thứ 5",
  Fri: "Thứ 6",
  Sat: "Thứ 7",
  Sun: "Chủ nhật",
};

const SESSION_REQUIREMENTS: Record<Mode, { title: string; description: string }[]> = {
  qr: [
    {
      title: "Mã QR",
      description: "Sinh viên quét QR bằng ứng dụng điểm danh để vào lớp",
    },
    {
      title: "Thời hạn 60s",
      description: "QR sẽ hết hạn sau 60 giây và tự động làm mới tối đa 3 lần",
    },
    {
      title: "Kết nối mạng",
      description: "Đảm bảo thiết bị của giảng viên và sinh viên có kết nối internet",
    },
  ],
  code: [
    {
      title: "Mã 6 ký tự",
      description: "Mã tự sinh gồm chữ cái và số, dùng cho sinh viên nhập tay",
    },
    {
      title: "Hiệu lực 60s",
      description: "Mã hết hạn sau 60 giây và tự động làm mới tối đa 3 lần trước khi đóng phiên",
    },
    {
      title: "Chia sẻ mã",
      description: "Giảng viên hiển thị hoặc đọc mã cho sinh viên nhập",
    },
  ],
  manual: [
    {
      title: "Chọn sinh viên",
      description: "Tích chọn những sinh viên có mặt trực tiếp trong bảng danh sách",
    },
    {
      title: "Lưu kết quả",
      description: "Nhấn 'Lưu điểm danh thủ công' để cập nhật trạng thái",
    },
    {
      title: "Không reset mã",
      description: "Chế độ thủ công không sử dụng mã tự sinh",
    },
  ],
};

const getToken = () => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("sas_user");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.token || null;
  } catch {
    return null;
  }
};

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const resp = await fetch(input, {
    credentials: "include",
    ...init,
    headers,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const message = data?.message || `HTTP ${resp.status}`;
    throw new Error(message);
  }
  return data as T;
}

const formatCountdown = (secondsLeft: number | null) => {
  if (secondsLeft == null) return "--";
  const total = Math.max(0, Math.floor(secondsLeft));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export default function LecturerAttendancePage() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(true);
  const [notifCount] = useState(2);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [cls, setCls] = useState<string>("");
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [slot, setSlot] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("qr");
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const [students, setStudents] = useState<AttendanceRow[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [autoResetPending, setAutoResetPending] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState<NodeJS.Timeout | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<{ title: string; description: string }[]>([]);
  const sessionRef = useRef<SessionDetail | null>(null);
  const countdownRef = useRef<number | null>(null);
  const isResettingRef = useRef(false);
  const expiresAtRef = useRef<string | null>(null);

  const updateQrPreview = useCallback(
    async (code: string, sessionType: Mode) => {
      if (sessionType !== "qr") {
        setQrImage(null);
        return;
      }
      try {
        const url = await QRCode.toDataURL(code, { width: 256, margin: 1 });
        setQrImage(url || null);
      } catch (qrErr) {
        console.error("generate qr error", qrErr);
        setQrImage(null);
      }
    },
    []
  );

  const filtered = useMemo(() => {
    if (filter === "present") return students.filter((s) => s.status === "present");
    if (filter === "absent") return students.filter((s) => s.status === "absent");
    if (filter === "excused") return students.filter((s) => s.status === "excused");
    return students;
  }, [students, filter]);

  const countdownDisplay = useMemo(() => formatCountdown(timeLeft), [timeLeft]);

  const resetStats = useMemo(() => {
    if (!session || session.type === "manual") {
      return { used: 0, total: 0, remaining: 0 };
    }
    const total = Math.max(0, session.maxResets);
    const used = Math.min(total, Math.max(0, session.attempts));
    return {
      used,
      total,
      remaining: Math.max(0, total - used),
    };
  }, [session]);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current != null) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCountdown();
    };
  }, [clearCountdown]);

  useEffect(() => {
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

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ themeDark: boolean }>).detail;
      if (!detail) return;
      setDark(detail.themeDark);
      document.documentElement.classList.toggle("dark-theme", detail.themeDark);
      document.documentElement.classList.toggle("light-theme", !detail.themeDark);
    };
    window.addEventListener("sas_settings_changed", handler);
    return () => window.removeEventListener("sas_settings_changed", handler);
  }, []);

  const stopPolling = useCallback(() => {
    if (polling) {
      clearInterval(polling);
      setPolling(null);
    }
  }, [polling]);

  useEffect(() => {
    fetchJson<{ success: boolean; data: ClassInfo[] }>(`${API_BASE}/classes`)
      .then((payload) => {
        setClasses(payload.data || []);
        if (payload.data?.length) {
          setCls(payload.data[0].id);
        }
      })
      .catch((err) => {
        console.error("fetch classes error", err);
        setError(err.message || "Không thể tải danh sách lớp");
      });
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

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
      window.dispatchEvent(new CustomEvent("sas_settings_changed" as any, { detail: merged }));
    } catch {}
  };

  const pollSession = useCallback(
    (sessionId: number) => {
      stopPolling();
      const timer = setInterval(async () => {
        try {
          const payload = await fetchJson<{ success: boolean; data: SessionDetail }>(`${API_BASE}/sessions/${sessionId}`);
          setSession(payload.data);
          updateQrPreview(payload.data.code, payload.data.type);
          if (payload.data.status !== "active") {
            clearInterval(timer);
            setPolling(null);
          }
        } catch (err) {
          console.error("poll session error", err);
        }
      }, 1000);
      setPolling(timer);
    },
    [stopPolling, updateQrPreview]
  );

  const fetchSlots = useCallback(
    async (classId: string) => {
      try {
        setSlots([]);
        setSlot(null);
        const today = new Date().toISOString().slice(0, 10);
        const payload = await fetchJson<{ success: boolean; data: SlotInfo[] }>(
          `${API_BASE}/classes/${classId}/slots?date=${today}`
        );
        setSlots(payload.data || []);
        setError(null);
        if (payload.data?.length) {
          setSlot(payload.data[0].slotId);
        }
      } catch (err: any) {
        console.error("fetch slots error", err);
        setSlots([]);
        setError(err.message || "Không thể tải slot lớp");
      }
    },
    []
  );

  const fetchHistory = useCallback(
    async (classId: string, slotId?: number | null) => {
      try {
        setHistoryLoading(true);
        const qs = slotId ? `?slot=${slotId}` : "";
        const payload = await fetchJson<{ success: boolean; data: HistoryItem[] }>(
          `${API_BASE}/classes/${classId}/history${qs}`
        );
        setHistory(payload.data || []);
      } catch (err) {
        console.error("fetch history error", err);
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    },
    []
  );

  const loadSessionStudents = useCallback(
    async (sessionId: number) => {
      try {
        setStudentLoading(true);
        const payload = await fetchJson<{ success: boolean; data: AttendanceRow[]; summary?: any }>(
          `${API_BASE}/sessions/${sessionId}/students`
        );
        setStudents(payload.data || []);
      } catch (err) {
        console.error("fetch session students error", err);
        setStudents([]);
      } finally {
        setStudentLoading(false);
      }
    },
    []
  );

  const refreshSessionData = useCallback(
    async (sessionId: number, options?: { loadStudents?: boolean }) => {
      try {
        const payload = await fetchJson<{ success: boolean; data: SessionDetail }>(
          `${API_BASE}/sessions/${sessionId}`
        );
        const data = payload.data;
        setSession(data);
        if (data.status === "active") {
          pollSession(sessionId);
        } else {
          stopPolling();
        }
        if (options?.loadStudents !== false) {
          await loadSessionStudents(sessionId);
        }
      } catch (err) {
        console.error("refresh session error", err);
        setSession(null);
        stopPolling();
      }
    },
    [loadSessionStudents, pollSession, stopPolling]
  );

  const createSession = useCallback(
    async (classId: string, slotId: number, selectedMode: Mode) => {
      try {
        setSessionLoading(true);
        setError(null);
        const today = new Date().toISOString().slice(0, 10);
        const payload = await fetchJson<{ success: boolean; data: SessionSummary; reused?: boolean }>(
          `${API_BASE}/sessions`,
          {
            method: "POST",
            body: JSON.stringify({ classId, slotId, type: selectedMode, date: today }),
          }
        );
        const summary = payload.data;
        await refreshSessionData(summary.id);
        fetchHistory(classId, slotId);
        setSessionNotice(null);
      } catch (err: any) {
        setError(err.message || "Không thể tạo buổi điểm danh");
      } finally {
        setSessionLoading(false);
      }
    },
    [fetchHistory, refreshSessionData]
  );

  const handleClassChange = useCallback(
    (classId: string) => {
      setCls(classId);
      setSession(null);
      setStudents([]);
      setQrImage(null);
      setSessionNotice(null);
      stopPolling();
      if (classId) {
        fetchSlots(classId);
        fetchHistory(classId, null);
      }
    },
    [fetchSlots, fetchHistory, stopPolling]
  );

  useEffect(() => {
    if (cls) {
      fetchSlots(cls);
      fetchHistory(cls, null);
    }
  }, [cls, fetchSlots, fetchHistory]);

  useEffect(() => {
    if (!cls || slot == null) return;
    fetchHistory(cls, slot);
  }, [cls, slot, fetchHistory]);

  useEffect(() => {
    sessionRef.current = session;
    if (!session) {
      setStudents([]);
      setQrImage(null);
      setRequirements([]);
      clearCountdown();
      return;
    }
    loadSessionStudents(session.id);
  }, [session, loadSessionStudents, clearCountdown]);

  useEffect(() => {
    if (!session) return;
    updateQrPreview(session.code, session.type);
    setRequirements(SESSION_REQUIREMENTS[session.type] || []);
  }, [session, updateQrPreview]);

  useEffect(() => {
    if (!session || session.type === "manual") {
      clearCountdown();
      setTimeLeft(null);
      expiresAtRef.current = null;
      return;
    }
    if (session.status !== "active") {
      clearCountdown();
      setTimeLeft(null);
      expiresAtRef.current = null;
      return;
    }
    if (!session.expiresAt) {
      clearCountdown();
      setTimeLeft(null);
      expiresAtRef.current = null;
      return;
    }

    expiresAtRef.current = session.expiresAt;
    const expireTime = new Date(session.expiresAt).getTime();
    const startCountdown = () => {
      const tick = () => {
        const diff = expireTime - Date.now();
        const seconds = Math.max(0, Math.round(diff / 1000));
        setTimeLeft(seconds);
        if (seconds <= 0) {
          clearCountdown();
        }
      };
      tick();
      clearCountdown();
      countdownRef.current = window.setInterval(tick, 1000);
    };

    startCountdown();

    return () => {
      clearCountdown();
    };
  }, [session, clearCountdown]);

  const triggerReset = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || current.type === "manual") return;
    if (current.status !== "active") return;
    if (current.attempts >= current.maxResets) return;
    if (isResettingRef.current) return;

    isResettingRef.current = true;
    setAutoResetPending(true);
    try {
      const payload = await fetchJson<{ success: boolean; data: SessionSummary }>(
        `${API_BASE}/sessions/${current.id}/reset`,
        {
          method: "POST",
        }
      );
      const updated = payload.data;
      sessionRef.current = { ...current, ...updated } as SessionDetail;
      setSession((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
      expiresAtRef.current = updated.expiresAt;
      await refreshSessionData(updated.id, { loadStudents: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message !== "Đã hết lượt reset mã") {
        console.error("auto reset session error", err);
      }
      const id = current.id;
      await refreshSessionData(id).catch(() => {});
    } finally {
      isResettingRef.current = false;
      setAutoResetPending(false);
    }
  }, [refreshSessionData]);

  useEffect(() => {
    if (!session || session.type === "manual") return;
    if (session.status !== "active") return;
    if (session.attempts >= session.maxResets) return;
    if (timeLeft == null || timeLeft > 0) return;
    if (autoResetPending || closingSession) return;
    if (isResettingRef.current) return;

    triggerReset();
  }, [session, timeLeft, autoResetPending, closingSession, triggerReset]);

  const handleCreateSession = useCallback(() => {
    if (!cls || slot == null) {
      setError("Vui lòng chọn lớp và slot");
      return;
    }
    createSession(cls, slot, mode);
  }, [cls, slot, mode, createSession]);

  const handleModeChange = useCallback(
    (nextMode: Mode) => {
      setMode(nextMode);
      if (session && nextMode !== session.type) {
        stopPolling();
        setSession(null);
        setStudents([]);
        setQrImage(null);
        setSessionNotice(null);
      }
    },
    [session, stopPolling]
  );

  const handleCloseSession = useCallback(async () => {
    if (!session) return;
    try {
      setClosingSession(true);
      setSessionNotice(null);
      await fetchJson<{ success: boolean; data: SessionSummary }>(
        `${API_BASE}/sessions/${session.id}/close`,
        {
          method: "POST",
        }
      );
      await refreshSessionData(session.id);
      stopPolling();
      setSessionNotice({ type: "success", message: "Phiên điểm danh thành công" });
    } catch (err: any) {
      console.error("close session error", err);
      setSessionNotice({ type: "error", message: "Phiên điểm danh thất bại" });
    } finally {
      setClosingSession(false);
    }
  }, [session, refreshSessionData, stopPolling]);

  const handleManualUpdate = useCallback(async () => {
    if (!session || !students.length) return;
    try {
      const payload = await fetchJson<{ success: boolean; data: AttendanceRow[] }>(
        `${API_BASE}/sessions/${session.id}/manual`,
        {
          method: "POST",
          body: JSON.stringify({
            students: students.map((item) => ({
              studentId: item.studentId,
              status: item.status,
              markedAt: item.markedAt,
              note: item.note,
            })),
          }),
        }
      );
      setStudents(payload.data || []);
      alert("Đã lưu điểm danh thủ công");
    } catch (err: any) {
      alert(err.message || "Không thể lưu điểm danh");
    }
  }, [session, students]);

  const handleManualCheckbox = useCallback(
    (studentId: string, checked: boolean) => {
      if (!session || session.type !== "manual") return;
      setStudents((prev) =>
        prev.map((item) =>
          item.studentId === studentId
            ? {
                ...item,
                status: checked ? "present" : "absent",
                markedAt: checked ? new Date().toISOString() : null,
              }
            : item
        )
      );
    },
    [session]
  );

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
            <div className="kv">
              <div className="k">Chọn lớp</div>
              <select className="input" value={cls} onChange={(e) => handleClassChange(e.target.value)}>
                <option value="" disabled>
                  -- Chọn lớp --
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} – {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="kv">
              <div className="k">Chọn slot/buổi</div>
              <select
                className="input"
                value={slot ?? ""}
                onChange={(e) => setSlot(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="" disabled>
                  -- Chọn slot --
                </option>
                {slots.map((item, index) => {
                  const optionKey = item.slotId != null ? `${item.slotId}-${item.weekKey ?? index}` : `slot-${index}`;
                  return (
                    <option key={optionKey} value={item.slotId}>
                    Slot {item.slotId}
                    {item.dayOfWeek ? ` • ${DAY_LABELS[item.dayOfWeek] || item.dayOfWeek}` : ""}
                    {item.room ? ` • Phòng ${item.room || "?"}` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="kv">
              <div className="k">Hình thức</div>
              <div className="seg">
                <button className={`seg-btn ${mode === "qr" ? "active" : ""}`} onClick={() => handleModeChange("qr")}>
                  QR code
                </button>
                <button className={`seg-btn ${mode === "code" ? "active" : ""}`} onClick={() => handleModeChange("code")}>
                  Nhập mã
                </button>
                <button className={`seg-btn ${mode === "manual" ? "active" : ""}`} onClick={() => handleModeChange("manual")}>
                  Thủ công
                </button>
              </div>
            </div>
            {!(mode === "manual" && session?.type === "manual") && (
              <div className="actions">
                <button className="btn-primary" disabled={!cls || slot === null || sessionLoading} onClick={handleCreateSession}>
                  {sessionLoading
                    ? "Đang xử lý..."
                    : mode === "manual"
                    ? "📋 Hiển thị danh sách sinh viên"
                    : "🧾 Tạo buổi điểm danh"}
                </button>
              </div>
            )}
          </div>

          {error && <div className="error-banner">⚠️ {error}</div>}

          {session && (
            <div className="session-box">
              <div className="qr-preview">
                <div className="qr-box">
                  {session.type === "qr" ? (
                    qrImage ? (
                      <img src={qrImage} alt="QR" style={{ width: 140, height: 140 }} />
                    ) : (
                      <span style={{ fontSize: 16 }}>Đang tạo QR...</span>
                    )
                  ) : session.type === "code" ? (
                    <span className="big-code">{session.code}</span>
                  ) : (
                    <span style={{ fontSize: 18, fontWeight: 600 }}>Điểm danh thủ công</span>
                  )}
                </div>
                <div className="qr-meta">
                  <div className="time-left">Trạng thái: {session.status}</div>
                  {session.type !== "manual" && <div className="time-left">Còn lại: {countdownDisplay}</div>}
                  {session.type !== "manual" && (
                    <div className="time-left">Lượt sử dụng mã: {resetStats.used}/{resetStats.total}</div>
                  )}
                  {session.type !== "manual" && (
                    <div className="time-left">Lượt còn lại: {resetStats.remaining}</div>
                  )}
                  {typeof session.totalStudents === "number" && <div className="time-left">Tổng SV: {session.totalStudents}</div>}
                  {session.type === "manual" && (
                    <div className="time-left">Chọn sinh viên có mặt và nhấn lưu để cập nhật.</div>
                  )}
                </div>
              </div>
              <div className="actions end">
                {session.type !== "manual" && (
                  <button
                    className="btn-primary"
                    onClick={handleCloseSession}
                    disabled={closingSession}
                  >
                    ✅ {closingSession ? "Đang kết thúc..." : "Kết thúc phiên"}
                  </button>
                )}
              </div>
              {sessionNotice && (
                <div
                  className="time-left"
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: sessionNotice.type === "success" ? "#dcfce7" : "#fee2e2",
                    color: sessionNotice.type === "success" ? "#166534" : "#b91c1c",
                    fontWeight: 500,
                  }}
                >
                  {sessionNotice.message}
                </div>
              )}
            </div>
          )}

          {!!requirements.length && (
            <div className="requirements-table">
              <div className="requirements-title">Yêu cầu khi điểm danh ({session?.type === "qr" ? "QR" : session?.type === "code" ? "Nhập mã" : "Thủ công"})</div>
              <table>
                <thead>
                  <tr>
                    <th>Nội dung</th>
                    <th>Mô tả</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.title}</td>
                      <td>{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="section-title">Danh sách điểm danh</div>
          <div className="row-actions">
            <div className="seg">
              <button className={`seg-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
                Tất cả
              </button>
              <button className={`seg-btn ${filter === "present" ? "active" : ""}`} onClick={() => setFilter("present")}>
                Đã điểm danh
              </button>
              <button className={`seg-btn ${filter === "absent" ? "active" : ""}`} onClick={() => setFilter("absent")}>
                Chưa điểm danh
              </button>
              <button className={`seg-btn ${filter === "excused" ? "active" : ""}`} onClick={() => setFilter("excused")}>
                Có phép
              </button>
            </div>
          </div>
          {studentLoading && <div className="loading-row">Đang tải danh sách...</div>}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã SV</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                  {session?.type === "manual" && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.studentId}>
                    <td>{s.studentId}</td>
                    <td>{s.fullName}</td>
                    <td>{s.email || "--"}</td>
                    <td>{s.status === "present" ? "✅ Có mặt" : s.status === "excused" ? "📝 Có phép" : "❌ Vắng"}</td>
                    <td>{s.markedAt ? formatVietnamTime(s.markedAt) : "--"}</td>
                    {session?.type === "manual" && (
                      <td>
                        <label className="manual-check">
                          <input
                            type="checkbox"
                            checked={s.status === "present"}
                            onChange={(event) => handleManualCheckbox(s.studentId, event.target.checked)}
                          />
                          Có mặt
                        </label>
                      </td>
                    )}
                  </tr>
                ))}
                {!filtered.length && !studentLoading && (
                  <tr>
                    <td colSpan={session?.type === "manual" ? 6 : 5} style={{ textAlign: "center", padding: 16, color: "#64748b" }}>
                      Chưa có dữ liệu điểm danh
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {session?.type === "manual" && (
            <div className="actions end" style={{ marginTop: 12 }}>
              <button className="btn-primary" onClick={handleManualUpdate}>
                💾 Lưu điểm danh thủ công
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="section-title">Lịch sử điểm danh</div>
        {historyLoading && <div className="loading-row">Đang tải lịch sử...</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Slot</th>
                <th>Hình thức</th>
                <th>Trạng thái</th>
                <th>Tỉ lệ tham dự</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>
                    <div>{formatVietnamDate(h.day)}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{formatVietnamWeekday(h.day)}</div>
                  </td>
                  <td>{h.slotId}</td>
                  <td>{h.type}</td>
                  <td>{h.status}</td>
                  <td>{h.ratio}% ({h.present}/{h.total})</td>
                </tr>
              ))}
              {!history.length && !historyLoading && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 16, color: "#64748b" }}>
                    Chưa có lịch sử điểm danh
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
