"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

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
};

type SessionSummary = {
  id: number;
  classId: string;
  slotId: number;
  code: string;
  type: Mode;
  status: "active" | "expired" | "closed";
  attempts: number;
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

const API_BASE = "http://localhost:8080/api/attendances";

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const resp = await fetch(input, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const message = data?.message || `HTTP ${resp.status}`;
    throw new Error(message);
  }
  return data as T;
}

const formatTimeLeft = (expiresAt: string | null) => {
  if (!expiresAt) return "--";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "00:00";
  const seconds = Math.ceil(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remain.toString().padStart(2, "0")}`;
};

export default function LecturerAttendancePage() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount] = useState(2);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [cls, setCls] = useState<string>("");
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [slot, setSlot] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("qr");
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [students, setStudents] = useState<AttendanceRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState<NodeJS.Timeout | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "present") return students.filter((s) => s.status === "present");
    if (filter === "absent") return students.filter((s) => s.status === "absent");
    if (filter === "excused") return students.filter((s) => s.status === "excused");
    return students;
  }, [students, filter]);

  const timeLeftDisplay = useMemo(() => formatTimeLeft(session?.expiresAt ?? null), [session]);

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
      document.documentElement.style.colorScheme = next ? "dark" : "light";
      window.dispatchEvent(new CustomEvent("sas_settings_changed" as any, { detail: merged }));
    } catch {}
  };

  const exportCsv = useCallback(() => {
    if (!filtered.length) {
      alert("Không có dữ liệu để xuất");
      return;
    }
    const header = ["MaSV", "HoTen", "Email", "TrangThai", "ThoiGian", "GhiChu"];
    const rows = filtered.map((s) => [
      s.studentId,
      s.fullName,
      s.email || "",
      s.status,
      s.markedAt || "",
      s.note || "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cls || "class"}-attendance.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, cls]);

  const pollSession = useCallback(
    (sessionId: number) => {
      stopPolling();
      const timer = setInterval(async () => {
        try {
          const payload = await fetchJson<{ success: boolean; data: SessionDetail }>(`${API_BASE}/sessions/${sessionId}`);
          setSession(payload.data);
          if (payload.data.status !== "active") {
            clearInterval(timer);
            setPolling(null);
          }
        } catch (err) {
          console.error("poll session error", err);
        }
      }, 5000);
      setPolling(timer);
    },
    [stopPolling]
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

  const loadSessionDetail = useCallback(
    async (sessionId: number) => {
      try {
        const payload = await fetchJson<{ success: boolean; data: SessionDetail }>(
          `${API_BASE}/sessions/${sessionId}`
        );
        setSession(payload.data);
        if (payload.data.type === "qr") {
          try {
            const url = await QRCode.toDataURL(payload.data.code, { width: 256, margin: 1 });
            setQrImage(url || null);
          } catch (qrErr) {
            console.error("generate qr error", qrErr);
            setQrImage(null);
          }
        } else {
          setQrImage(null);
        }
        if (payload.data.status === "active") {
          pollSession(sessionId);
        }
        await loadSessionStudents(sessionId);
      } catch (err) {
        console.error("load session detail error", err);
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
        const payload = await fetchJson<{ success: boolean; data: SessionSummary; reused?: boolean }>(`${API_BASE}/sessions`, {
          method: "POST",
          body: JSON.stringify({ classId, slotId, type: selectedMode }),
        });
        const summary = payload.data;
        await loadSessionDetail(summary.id);
        fetchHistory(classId, slotId);
      } catch (err: any) {
        setError(err.message || "Không thể tạo buổi điểm danh");
      } finally {
        setSessionLoading(false);
      }
    },
    [fetchHistory, loadSessionDetail]
  );

  const handleClassChange = useCallback(
    (classId: string) => {
      setCls(classId);
      setSession(null);
      setStudents([]);
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
    if (!session) {
      setStudents([]);
      return;
    }
    loadSessionStudents(session.id);
  }, [session, loadSessionStudents]);

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
        setSession(null);
        setStudents([]);
      }
    },
    [session]
  );

  const handleReset = useCallback(async () => {
    if (!session) return;
    try {
      setResetLoading(true);
      const payload = await fetchJson<{ success: boolean; data: SessionSummary }>(
        `${API_BASE}/sessions/${session.id}/reset`,
        { method: "POST" }
      );
      await loadSessionDetail(payload.data.id);
    } catch (err: any) {
      alert(err.message || "Không thể reset mã");
    } finally {
      setResetLoading(false);
    }
  }, [session, loadSessionDetail]);

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

  const toggleStudentStatus = useCallback(
    (studentId: string) => {
      if (!session || session.type !== "manual") return;
      setStudents((prev) =>
        prev.map((item) => {
          if (item.studentId !== studentId) return item;
          const nextStatus = item.status === "present" ? "absent" : "present";
          return {
            ...item,
            status: nextStatus,
            markedAt: nextStatus === "present" ? new Date().toISOString() : null,
          };
        })
      );
    },
    [session]
  );

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
              <select className="input" value={cls} onChange={(e)=>handleClassChange(e.target.value)}>
                <option value="" disabled>-- Chọn lớp --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.code} – {c.name}</option>
                ))}
              </select>
            </div>
            <div className="kv"><div className="k">Chọn slot/buổi</div>
              <select
                className="input"
                value={slot ?? ""}
                onChange={(e)=>setSlot(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="" disabled>-- Chọn slot --</option>
                {slots.map((item) => (
                  <option key={item.slotId} value={item.slotId}>
                    Slot {item.slotId}{item.room ? ` • Phòng ${item.room}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="kv"><div className="k">Hình thức</div>
              <div className="seg">
                <button className={`seg-btn ${mode==='qr'?'active':''}`} onClick={()=>handleModeChange('qr')}>QR code</button>
                <button className={`seg-btn ${mode==='code'?'active':''}`} onClick={()=>handleModeChange('code')}>Nhập mã</button>
                <button className={`seg-btn ${mode==='manual'?'active':''}`} onClick={()=>handleModeChange('manual')}>Thủ công</button>
              </div>
            </div>
            <div className="actions">
              <button className="btn-primary" disabled={!cls || slot === null || sessionLoading} onClick={handleCreateSession}>
                {sessionLoading ? "Đang xử lý..." : "🧾 Tạo buổi điểm danh"}
              </button>
            </div>
          </div>

          {error && <div className="error-banner">⚠️ {error}</div>}

          {session && (
            <div className="session-box">
              <div className="qr-preview">
                <div className="qr-box">
                  {mode === "qr" ? (
                    qrImage ? (
                      <img src={qrImage} alt="QR" style={{ width: 140, height: 140 }} />
                    ) : (
                      <span style={{ fontSize: 16 }}>Đang tạo QR...</span>
                    )
                  ) : (
                    <span style={{ fontSize: 24 }}>{mode === "manual" ? "Thủ công" : "Mã"}</span>
                  )}
                </div>
                <div className="qr-meta">
                  <div className="big-code">{session.code}</div>
                  <div className="time-left">Trạng thái: {session.status}</div>
                  {mode !== "manual" && (
                    <div className="time-left">Còn lại: {timeLeftDisplay}</div>
                  )}
                  <div className="time-left">Đã reset: {session.attempts}/{3}</div>
                </div>
              </div>
              <div className="actions end">
                <button className="btn-outline" onClick={exportCsv}>Xuất Excel</button>
                {mode !== "manual" && (
                  <button className="btn-primary" onClick={handleReset} disabled={resetLoading || session.attempts >= 3 || session.status !== "active"}>
                    ♻️ {resetLoading ? "Đang reset" : "Reset mã"}
                  </button>
                )}
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
              <button className={`seg-btn ${filter==='excused'?'active':''}`} onClick={()=>setFilter('excused')}>Có phép</button>
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
                  {mode === "manual" && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.studentId}>
                    <td>{s.studentId}</td>
                    <td>{s.fullName}</td>
                    <td>{s.email || "--"}</td>
                    <td>{s.status === "present" ? "✅ Có mặt" : s.status === "excused" ? "📝 Có phép" : "❌ Vắng"}</td>
                    <td>{s.markedAt ? new Date(s.markedAt).toLocaleTimeString() : "--"}</td>
                    {mode === "manual" && (
                      <td>
                        <button className="btn-outline" onClick={() => toggleStudentStatus(s.studentId)}>Đổi trạng thái</button>
                      </td>
                    )}
                  </tr>
                ))}
                {!filtered.length && !studentLoading && (
                  <tr>
                    <td colSpan={mode === "manual" ? 6 : 5} style={{ textAlign: "center", padding: 16, color: "#64748b" }}>
                      Chưa có dữ liệu điểm danh
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {mode === "manual" && session && (
            <div className="actions end" style={{ marginTop: 12 }}>
              <button className="btn-primary" onClick={handleManualUpdate}>💾 Lưu điểm danh thủ công</button>
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
                  <td>{h.day}</td>
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

