"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { Dialog, DialogTitle, DialogContent, Grid, Typography, Box } from "@mui/material";
import { useSearchParams } from "next/navigation";
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

type SessionStatus = "active" | "expired" | "closed" | "ended" | string;

type SessionSummary = {
  id: string;
  classId: string | null;
  slotId: number | null;
  day: string | null;
  code: string | null;
  type: Mode;
  status: SessionStatus;
  attempts: number;
  maxResets: number;
  attemptsRemaining: number;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  endedAt?: string | null;
  totalStudents?: number | null;
  createdBy?: string | null;
};

type SessionDetail = SessionSummary & {
  className?: string | null;
  subjectName?: string | null;
  totalStudents?: number | null;
};

type AttendanceStatus = "present" | "absent" | "excused";

type AttendanceRow = {
  recordId?: string | null;
  studentId: string;
  fullName: string | null;
  email?: string | null;
  course?: string | null;
  status: AttendanceStatus;
  markedAt: string | null;
  modifiedAt?: string | null;
  modifiedBy?: string | null;
  note?: string | null;
};

type AttendanceSummary = {
  total: number;
  present: number;
  excused: number;
  absent: number;
};

type HistoryItem = SessionSummary & {
  summary: AttendanceSummary;
  ratio: number;
};

type HistoryDetail = {
  session: SessionDetail;
  records: AttendanceRow[];
  summary: AttendanceSummary;
};

type Mode = "qr" | "code" | "manual";

type Filter = "all" | "present" | "absent" | "excused";

const API_BASE = makeApiUrl("/api/attendances");

const ensureSummary = (summary?: Partial<AttendanceSummary> | null): AttendanceSummary => ({
  total: summary?.total ?? 0,
  present: summary?.present ?? 0,
  excused: summary?.excused ?? 0,
  absent: summary?.absent ?? 0,
});

const computeRatio = (summary: AttendanceSummary): number => {
  if (!summary.total) return 0;
  return Math.round((summary.present / summary.total) * 100);
};

const getSessionDisplayDate = (session?: SessionSummary | SessionDetail | null): string | null => {
  if (!session) return null;
  return session.day ?? session.createdAt ?? session.updatedAt ?? session.endedAt ?? null;
};

const formatDateOrFallback = (value: string | null) => (value ? formatVietnamDate(value) : "--");
const formatWeekdayOrFallback = (value: string | null) => (value ? formatVietnamWeekday(value) : "--");

const MODE_LABELS: Record<Mode, string> = {
  qr: "QR code",
  code: "Nhập mã",
  manual: "Thủ công",
};

const sessionHasMode = (typeStr: string | undefined | null, mode: Mode) => {
  if (!typeStr) return false;
  return String(typeStr).split(",").map((s) => s.trim()).filter(Boolean).includes(mode);
};

const displayModeLabel = (typeStr: string | undefined | null) => {
  if (!typeStr) return "-";
  const parts = String(typeStr)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const labels = parts.map((p) => MODE_LABELS[p as Mode] || p);
  return labels.join(" + ");
};

const combinedRequirementsForType = (typeStr: string | undefined | null) => {
  if (!typeStr) return [] as { title: string; description: string }[];
  const parts = String(typeStr).split(",").map((s) => s.trim()).filter(Boolean) as Mode[];
  const seen = new Set();
  const out: { title: string; description: string }[] = [];
  for (const p of parts) {
    const list = SESSION_REQUIREMENTS[p] || [];
    for (const item of list) {
      const key = `${item.title}::${item.description}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(item);
      }
    }
  }
  return out;
};

const STATUS_LABELS: Record<string, string> = {
  active: "Đang diễn ra",
  expired: "Hết hạn",
  closed: "Đã đóng",
  ended: "Đã kết thúc",
};

const DAY_LABELS: Record<string, string> = {
  Mon: "Thứ 2",
  Tue: "Thứ 3",
  Wed: "Thứ 4",
  Thu: "Thứ 5",
  Fri: "Thứ 6",
  Sat: "Thứ 7",
  Sun: "Chủ nhật",
};

const ATTENDANCE_STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Có mặt" },
  { value: "absent", label: "Vắng" },
  { value: "excused", label: "Có phép" },
];

type ApiHistoryItem = SessionSummary & { summary?: Partial<AttendanceSummary> | null };

const normalizeAttendanceStatus = (status: any): AttendanceStatus => {
  const value = typeof status === "string" ? status.toLowerCase() : "";
  if (value === "present" || value === "excused") return value;
  return "absent";
};

const mapApiRecordToRow = (record: any): AttendanceRow => ({
  recordId: record?.id ?? null,
  studentId: record?.studentId ?? "",
  fullName: record?.fullName ?? null,
  email: record?.email ?? null,
  course: record?.course ?? null,
  status: normalizeAttendanceStatus(record?.status),
  markedAt: record?.markedAt ?? record?.recordedAt ?? null,
  modifiedAt: record?.modifiedAt ?? null,
  modifiedBy: record?.modifiedBy ?? null,
  note: record?.note ?? null,
});

const mapSessionStudentRow = (item: any): AttendanceRow => ({
  recordId: item?.recordId ?? item?.id ?? null,
  studentId: item?.studentId ?? "",
  fullName: item?.fullName ?? null,
  email: item?.email ?? null,
  course: item?.course ?? null,
  status: normalizeAttendanceStatus(item?.status),
  markedAt: item?.markedAt ?? item?.recordedAt ?? null,
  modifiedAt: item?.modifiedAt ?? null,
  modifiedBy: item?.modifiedBy ?? null,
  note: item?.note ?? null,
});

const normalizeHistoryItem = (item: ApiHistoryItem): HistoryItem => {
  const summary = ensureSummary(item.summary);
  return {
    ...item,
    summary,
    ratio: computeRatio(summary),
  };
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
  const searchParams = useSearchParams();
  const paramClass = (searchParams?.get("class") || "").trim();
  const paramSlotRaw = (searchParams?.get("slot") || "").trim();
  const paramSlot = paramSlotRaw && !Number.isNaN(Number(paramSlotRaw)) ? Number(paramSlotRaw) : null;
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(true);
  const [notifCount] = useState(2);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [cls, setCls] = useState<string>("");
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("qr");
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const [students, setStudents] = useState<AttendanceRow[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [autoExpired, setAutoExpired] = useState(false);
  const [autoResetPending, setAutoResetPending] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyDate, setHistoryDate] = useState<string>(() => {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  });
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [historyDetail, setHistoryDetail] = useState<HistoryDetail | null>(null);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);
  const [historyDetailError, setHistoryDetailError] = useState<string | null>(null);
  const [updatingRecordId, setUpdatingRecordId] = useState<string | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState<NodeJS.Timeout | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<{ title: string; description: string }[]>([]);
  const [autoModalOpen, setAutoModalOpen] = useState(false);
  const sessionRef = useRef<SessionDetail | null>(null);
  const countdownRef = useRef<number | null>(null);
  const isResettingRef = useRef(false);
  const expiresAtRef = useRef<string | null>(null);

  const updateQrPreview = useCallback(
    async (code: string | null, sessionType: string | Mode | null) => {
      const hasQr = typeof sessionType === 'string' ? String(sessionType).split(',').map(s=>s.trim()).includes('qr') : sessionType === 'qr';
      if (!hasQr || !code) {
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

  const CountdownLabel = useMemo(() => {
    return memo(function CountdownLabelComp({ expiresAt }: { expiresAt: string | null }) {
      const [seconds, setSeconds] = useState<number | null>(null);
      useEffect(() => {
        if (!expiresAt) {
          setSeconds(null);
          return;
        }
        const expiry = new Date(expiresAt).getTime();
        const tick = () => {
          const diff = expiry - Date.now();
          const s = Math.max(0, Math.round(diff / 1000));
          setSeconds(s);
        };
        tick();
        const t = window.setInterval(tick, 1000);
        return () => window.clearInterval(t);
      }, [expiresAt]);
      return <>{formatCountdown(seconds)}</>;
    });
  }, []);

  // Đã có phiên kết thúc/đóng cho lớp + slot hôm nay?
  const finalizedToday = useMemo(() => {
    if (!history?.length) return false;
    return history.some((h) => (h.status === "ended" || h.status === "closed") && (slot == null || h.slotId === slot));
  }, [history, slot]);

  const resetStats = useMemo(() => {
    if (!session || sessionHasMode(session.type, "manual")) {
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

  const expireTimeoutRef = useRef<number | null>(null);
  const clearExpireTimeout = useCallback(() => {
    if (expireTimeoutRef.current != null) {
      window.clearTimeout(expireTimeoutRef.current);
      expireTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCountdown();
      clearExpireTimeout();
    };
  }, [clearCountdown, clearExpireTimeout]);

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
        const list = payload.data || [];
        setClasses(list);
        if (list.length) {
          const found = paramClass && list.find((c) => c.id === paramClass)?.id;
          setCls(found || list[0].id);
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
    (sessionId: string) => {
      stopPolling();
      const timer = setInterval(async () => {
        try {
          const payload = await fetchJson<{ success: boolean; data: SessionDetail }>(`${API_BASE}/sessions/${sessionId}`);
          const prev = sessionRef.current;
          const next = payload.data;
          const changed = !prev
            || prev.status !== next.status
            || prev.code !== next.code
            || prev.expiresAt !== next.expiresAt
            || prev.attempts !== next.attempts
            || prev.type !== next.type;
          if (changed) {
            setSession(next);
          }
          if (!prev || prev.code !== next.code || prev.type !== next.type) {
            updateQrPreview(next.code, next.type);
          }
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
        setFormNotice(null);
        const targetDate = historyDate || (() => {
          const d = new Date();
          const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
          return local.toISOString().slice(0, 10);
        })();
        const payload = await fetchJson<{ success: boolean; data: SlotInfo[] }>(
          `${API_BASE}/classes/${classId}/slots?date=${targetDate}`
        );
        const list = payload.data || [];
        const seen = new Set<number>();
        const unique = [] as SlotInfo[];
        for (const item of list) {
          const id = Number(item.slotId);
          if (!Number.isInteger(id)) continue;
          if (id < 1 || id > 4) continue;
          if (!seen.has(id)) {
            seen.add(id);
            unique.push(item);
          }
        }
        unique.sort((a, b) => (a.slotId ?? 0) - (b.slotId ?? 0));
        setSlots(unique);
        setError(null);
        // yêu cầu: xoá hoàn toàn thông báo "Đã chuẩn hoá danh sách slot..."
        if (!list.length) {
          setFormNotice(null);
        }
        if (unique.length) {
          const desired = (paramSlot && unique.find((s) => s.slotId === paramSlot)?.slotId) || null;
          setSlot(desired ?? unique[0].slotId);
        }
      } catch (err: any) {
        console.error("fetch slots error", err);
        setSlots([]);
        setError(err.message || "Không thể tải slot lớp");
      }
    },
    [paramSlot, historyDate]
  );

  const fetchHistory = useCallback(
    async ({ classId, date, slotId }: { classId: string; date: string; slotId?: number | null }) => {
      if (!classId) {
        setHistory([]);
        return;
      }
      try {
        setHistoryLoading(true);
        const params = new URLSearchParams({ classId, date });
        if (slotId != null) params.append("slot", String(slotId));
        const payload = await fetchJson<{ success: boolean; data: ApiHistoryItem[] }>(
          `${API_BASE}/sessions?${params.toString()}`
        );
        const items = (payload.data || []).map(normalizeHistoryItem);
        setHistory(items);
        // Do NOT auto-select the first item to avoid auto-opening the detail modal.
        setSelectedHistoryId((prev) => (prev && items.some((item) => item.id === prev) ? prev : null));
      } catch (err) {
        console.error("fetch history error", err);
        setHistory([]);
        setSelectedHistoryId(null);
      } finally {
        setHistoryLoading(false);
      }
    },
    []
  );

  const loadSessionStudents = useCallback(
    async (sessionId: string) => {
      try {
        setStudentLoading(true);
        const payload = await fetchJson<{ success: boolean; data: any[]; summary?: Partial<AttendanceSummary> }>(
          `${API_BASE}/sessions/${sessionId}/students`
        );
        if (!payload || !payload.success) {
          throw new Error((payload as any)?.message || "Không thể tải danh sách sinh viên");
        }
        const rows = (payload.data || []).map(mapSessionStudentRow);
        if (!rows.length) {
          // Fallback: try to fetch session detail which includes mapped records
          try {
            const fallback = await fetchJson<{ success: boolean; data: HistoryDetail }>(`${API_BASE}/session/${sessionId}`);
            if (fallback && fallback.success && fallback.data && Array.isArray(fallback.data.records)) {
              const fallbackRows = (fallback.data.records || []).map(mapApiRecordToRow);
              setStudents(fallbackRows);
              return;
            }
          } catch (fbErr) {
            console.warn("fallback fetch session records failed", fbErr);
          }
        }
        setStudents(rows);
      } catch (err) {
        console.error("fetch session students error", err);
        setStudents([]);
        setSessionNotice({ type: "error", message: (err as any)?.message || "Không thể tải danh sách sinh viên" });
      } finally {
        setStudentLoading(false);
      }
    },
    []
  );

  const refreshSessionData = useCallback(
    async (sessionId: string, options?: { loadStudents?: boolean }) => {
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

  const fetchHistoryDetail = useCallback(
    async (sessionId: string) => {
      setHistoryDetailLoading(true);
      setHistoryDetailError(null);
      try {
        const payload = await fetchJson<{ success: boolean; data: HistoryDetail }>(`${API_BASE}/session/${sessionId}`);
        const records = payload.data.records.map(mapApiRecordToRow);
        const summary = ensureSummary(payload.data.summary);
        setHistoryDetail({
          session: payload.data.session,
          records,
          summary,
        });
      } catch (err: any) {
        console.error("fetch history detail error", err);
        setHistoryDetailError(err.message || "Không thể tải chi tiết buổi điểm danh");
        setHistoryDetail(null);
      } finally {
        setHistoryDetailLoading(false);
      }
    },
    []
  );

  const patchHistoryRecord = useCallback(
    async ({ sessionId, recordId, status, note }: { sessionId: string; recordId: string; status: AttendanceStatus; note?: string | null }) => {
      setUpdatingRecordId(recordId);
      try {
        const payload = await fetchJson<{ success: boolean; data: { record: any; summary: Partial<AttendanceSummary> } }>(
          `${API_BASE}/session/${sessionId}/record/${recordId}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status, note }),
          }
        );
        const updated = mapApiRecordToRow(payload.data.record);
        const summary = ensureSummary(payload.data.summary);
        setHistoryDetail((prev) => {
          if (!prev) return prev;
          const records = prev.records.map((item) => (item.recordId === updated.recordId ? updated : item));
          return {
            ...prev,
            records,
            summary,
          };
        });
      } catch (err: any) {
        console.error("patch history record error", err);
        alert(err.message || "Không thể cập nhật bản ghi");
      } finally {
        setUpdatingRecordId(null);
      }
    },
    []
  );

  const createSession = useCallback(
    async (classId: string, slotId: number, selectedMode: Mode) => {
      try {
        setSessionLoading(true);
        setError(null);
        if (finalizedToday && selectedMode !== "manual") {
          setError("Đã hoàn thành phiên điểm danh. Chỉ có thể tạo lại phiên không phải thủ công nếu có thay đổi.");
          return;
        }
        if (finalizedToday && selectedMode === "manual") {
          // Allow creating manual edits even if a finalized session exists for the day.
          // Show a non-blocking notice.
          setSessionNotice({ type: "success", message: "Phiên đã hoàn thành — đang mở lại để chỉnh thủ công" });
        }
        // Use selected history date (if any) as the session date so UI date filters
        // and created sessions are consistent. Fall back to today if not set.
        const sessionDate = historyDate || (() => {
          const d = new Date();
          const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
          return local.toISOString().slice(0, 10);
        })();
        const payload = await fetchJson<{ success: boolean; data: SessionSummary; reused?: boolean }>(
          `${API_BASE}/sessions`,
          {
            method: "POST",
            body: JSON.stringify({ classId, slotId, type: selectedMode, date: sessionDate }),
          }
        );
        const summary = payload.data;
        // Ensure we refresh session and explicitly load students. Some backends
        // may return before student records are ready, so call loadSessionStudents
        // directly as a fallback.
        await refreshSessionData(summary.id);
        try {
          await loadSessionStudents(summary.id);
        } catch (e) {
          // Best-effort fallback: try direct fetch of students endpoint
          try {
            const p = await fetchJson<{ success: boolean; data: any[] }>(`${API_BASE}/sessions/${summary.id}/students`);
            const rows = (p.data || []).map(mapSessionStudentRow);
            setStudents(rows);
          } catch (innerErr) {
            // ignore - UI will show empty state and error banner if needed
            console.error("failed to load session students fallback", innerErr);
          }
        }
        fetchHistory({ classId, date: historyDate, slotId });
        setSessionNotice(null);
      } catch (err: any) {
        const msg = err.message || "Không thể tạo buổi điểm danh";
        if (msg.includes("Đã hoàn thành phiên điểm danh")) {
          setError("Đã hoàn thành phiên điểm danh. Chỉ có thể tạo lại phiên không phải thủ công nếu có thay đổi.");
        } else {
          setError(msg);
        }
      } finally {
        setSessionLoading(false);
      }
    },
    [fetchHistory, historyDate, refreshSessionData, finalizedToday]
  );

  const handleClassChange = useCallback(
    (classId: string) => {
      setCls(classId);
      setSession(null);
      setStudents([]);
      setQrImage(null);
      setSessionNotice(null);
      stopPolling();
      const d = new Date();
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      const today = local.toISOString().slice(0, 10);
      setHistoryDate(today);
      if (classId) {
        fetchSlots(classId);
        fetchHistory({ classId, date: today, slotId: null });
      }
    },
    [fetchSlots, fetchHistory, stopPolling]
  );

  useEffect(() => {
    if (cls) {
      fetchSlots(cls);
      fetchHistory({ classId: cls, date: historyDate, slotId: null });
    }
  }, [cls, historyDate, fetchSlots, fetchHistory]);

  useEffect(() => {
    if (!cls || slot == null) return;
    fetchHistory({ classId: cls, date: historyDate, slotId: slot });
  }, [cls, slot, historyDate, fetchHistory]);

  useEffect(() => {
    if (!cls) return;
    fetchHistory({ classId: cls, date: historyDate, slotId: slot });
  }, [historyDate, cls, slot, fetchHistory]);

  useEffect(() => {
    if (!selectedHistoryId) {
      setHistoryDetail(null);
      setHistoryDetailError(null);
      return;
    }
    fetchHistoryDetail(selectedHistoryId);
  }, [selectedHistoryId, fetchHistoryDetail]);

  useEffect(() => {
    sessionRef.current = session;
    if (!session) {
      // Clear any lingering loading indicator when session is cleared
      setStudentLoading(false);
      setStudents([]);
      setQrImage(null);
      setRequirements([]);
      clearCountdown();
      return;
    }
    // Chỉ gọi loadSessionStudents nếu chưa có dữ liệu hoặc đang loading
    if (!studentLoading && students.length === 0) {
      loadSessionStudents(session.id);
    }
  }, [session, loadSessionStudents, clearCountdown, studentLoading, students.length]);

  useEffect(() => {
    if (!session) return;
    updateQrPreview(session.code, session.type);
    setRequirements(combinedRequirementsForType(session.type));
  }, [session, updateQrPreview]);

  useEffect(() => {
    if (!session || sessionHasMode(session.type, "manual")) {
      clearCountdown();
      setTimeLeft(null);
      setAutoExpired(false);
      expiresAtRef.current = null;
      clearExpireTimeout();
      return;
    }
    if (session.status !== "active") {
      clearCountdown();
      setTimeLeft(null);
      setAutoExpired(false);
      expiresAtRef.current = null;
      setAutoModalOpen(false);
      clearExpireTimeout();
      return;
    }
    if (!session.expiresAt) {
      clearCountdown();
      setTimeLeft(null);
      setAutoExpired(false);
      expiresAtRef.current = null;
      clearExpireTimeout();
      return;
    }

    expiresAtRef.current = session.expiresAt;
    const expireTime = new Date(session.expiresAt).getTime();
    const diffMs = Math.max(0, expireTime - Date.now());
    clearCountdown();
    clearExpireTimeout();
    setAutoExpired(false);
    expireTimeoutRef.current = window.setTimeout(() => {
      setAutoExpired(true);
    }, diffMs);

    return () => {
      clearCountdown();
      clearExpireTimeout();
    };
  }, [session, clearCountdown, clearExpireTimeout]);

  const triggerReset = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || sessionHasMode(current.type, "manual")) return;
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
    if (!session || sessionHasMode(session.type, "manual")) return;
    if (session.status !== "active") return;
    if (session.attempts >= session.maxResets) return;
    if (!autoExpired) return;
    if (autoResetPending || closingSession) return;
    if (isResettingRef.current) return;

    setAutoExpired(false);
    triggerReset();
  }, [session, autoExpired, autoResetPending, closingSession, triggerReset]);

  useEffect(() => {
    if (!session) return;
    if (!sessionHasMode(session.type, "manual") && (session.attempts >= session.maxResets)) {
      setAutoModalOpen(false);
      setSessionNotice({ type: "success", message: "Đang kiểm tra danh sách sinh viên tham gia điểm danh" });
    }
  }, [session]);

  const handleCreateSession = useCallback(() => {
    if (!cls || slot == null) {
      setError("Vui lòng chọn lớp và slot");
      return;
    }
    createSession(cls, slot, mode);
    if (mode !== "manual") setAutoModalOpen(true);
  }, [cls, slot, mode, createSession]);

  const handleModeChange = useCallback(
    (nextMode: Mode) => {
      setMode(nextMode);
      // If current session already supports the requested mode, keep it.
      if (session && !sessionHasMode(session.type, nextMode)) {
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
      setSessionNotice({ type: "success", message: "Kết thúc phiên điểm danh thành công" });
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
      if (!session || !sessionHasMode(session.type, "manual")) return;
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
                <button className={`seg-btn ${mode !== "manual" ? "active" : ""}`} onClick={() => handleModeChange("qr")}>
                  Tự động
                </button>
                <button className={`seg-btn ${mode === "manual" ? "active" : ""}`} onClick={() => handleModeChange("manual")}>
                  Thủ công
                </button>
              </div>
            </div>
            {!(mode === "manual" && sessionHasMode(session?.type, "manual")) && (
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
                  {sessionHasMode(session.type, "manual") ? (
                    <span style={{ fontSize: 18, fontWeight: 600 }}>Điểm danh thủ công</span>
                  ) : (
                    <span style={{ fontSize: 16 }}>Đang điểm danh (xem popup)</span>
                  )}
                </div>
                <div className="qr-meta">
                  <div className="time-left">Trạng thái: {session.status}</div>
                  {!sessionHasMode(session.type, "manual") && <div className="time-left">Còn lại: <CountdownLabel expiresAt={session.expiresAt || null} /></div>}
                  {!sessionHasMode(session.type, "manual") && (
                    <div className="time-left">Lượt sử dụng mã: {resetStats.used}/{resetStats.total}</div>
                  )}
                  {!sessionHasMode(session.type, "manual") && (
                    <div className="time-left">Lượt còn lại: {resetStats.remaining}</div>
                  )}
                  {typeof session.totalStudents === "number" && <div className="time-left">Tổng SV: {session.totalStudents}</div>}
                  {sessionHasMode(session.type, "manual") && (
                    <div className="time-left">Chọn sinh viên có mặt và nhấn lưu để cập nhật.</div>
                  )}
                </div>
              </div>
              <div className="actions" style={{ justifyContent: "center" }}>
                {!sessionHasMode(session.type, "manual") && (
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
              <div className="requirements-title">Yêu cầu khi điểm danh ({displayModeLabel(session?.type)})</div>
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
                  {session && sessionHasMode(session.type, "manual") && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows = [];
                  for (let i = 0; i < filtered.length; i++) {
                    const s = filtered[i];
                    rows.push(
                      <tr key={s.studentId}>
                        <td>{s.studentId}</td>
                        <td>{s.fullName}</td>
                        <td>{s.email || "--"}</td>
                        <td>{s.status === "present" ? "✅ Có mặt" : s.status === "excused" ? "📝 Có phép" : "❌ Vắng"}</td>
                        <td>{s.markedAt ? formatVietnamTime(s.markedAt) : "--"}</td>
                        {session && sessionHasMode(session.type, "manual") && (
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
                    );
                  }
                  return rows;
                })()}
                {!filtered.length && !studentLoading && (
                  <tr>
                    <td colSpan={session && sessionHasMode(session.type, "manual") ? 6 : 5} style={{ textAlign: "center", padding: 16, color: "#64748b" }}>
                      Chưa có dữ liệu điểm danh
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {session && sessionHasMode(session.type, "manual") && (
            <div className="actions end" style={{ marginTop: 12 }}>
              <button className="btn-primary" onClick={handleManualUpdate}>
                💾 Lưu điểm danh thủ công
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="panel history-panel">
        <div className="history-title">Lịch sử điểm danh</div>
        <div className="history-filters">
          <input
            type="date"
            className="input"
            value={historyDate}
            onChange={(e) => {
              const val = e.target.value;
              if (val) setHistoryDate(val);
              else {
                const d = new Date();
                const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                setHistoryDate(local.toISOString().slice(0, 10));
              }
            }}
            style={{ width: 140 }}
          />
        </div>
        {historyLoading && <div className="loading-row">Đang tải lịch sử...</div>}
        <div className="table-wrap">
          <table className="history-table history-list">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Slot</th>
                <th>Hình thức</th>
                <th>Trạng thái</th>
                <th>Tỉ lệ tham dự</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const summary = ensureSummary(h.summary);
                const isSelected = selectedHistoryId === h.id;
                return (
                  <tr
                    key={h.id}
                    onClick={() => setSelectedHistoryId(h.id)}
                    className={`history-row ${isSelected ? "selected" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div className="cell-main">{h.createdAt ? formatVietnamTime(h.createdAt) : "--"}</div>
                    </td>
                    <td className="cell-main">{h.slotId ?? "--"}</td>
                    <td className="cell-main">{sessionHasMode(h.type, "manual") ? "Thủ công" : "Tự động"}</td>
                    <td>
                      {h.status === "closed" ? (
                        <span className="status-pill status-closed">{STATUS_LABELS[h.status] || h.status}</span>
                      ) : (
                        <span className="cell-main">{STATUS_LABELS[h.status] || h.status}</span>
                      )}
                    </td>
                    <td>
                      <div className="cell-main">{h.ratio}%</div>
                      <div className="cell-sub">{summary.present}/{summary.total}</div>
                    </td>
                  </tr>
                );
              })}
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

        {/* Popup MUI cho phiên tự động */}
        <Dialog open={autoModalOpen && !!session && !sessionHasMode(session?.type, "manual")} onClose={() => setAutoModalOpen(false)} fullWidth maxWidth="lg">
          <DialogTitle>Phiên điểm danh tự động</DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Typography variant="h6" gutterBottom>Nội quy điểm danh</Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>Mã QR: Sinh viên quét QR để điểm danh</li>
                  <li>Mã ký tự: Sinh viên nhập mã để điểm danh</li>
                  <li>Reset: Tự động reset mỗi 60s (tối đa 3 lần)</li>
                </Box>
              </Grid>
              <Grid item xs={12} md={7}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {qrImage ? (
                    <img src={qrImage} alt="QR" style={{ width: '100%', maxWidth: 640 }} />
                  ) : (
                    <Typography>Đang tạo QR...</Typography>
                  )}
                  <Typography variant="h4" sx={{ mt: 2, fontWeight: 700 }}>{session?.code}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="h6" gutterBottom>Thông tin phiên</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography>Trạng thái: Đang điểm danh</Typography>
                  {typeof session?.totalStudents === 'number' && (
                    <Typography>Tổng sinh viên: {session?.totalStudents}</Typography>
                  )}
                  <Typography>Thời gian: <CountdownLabel expiresAt={session?.expiresAt || null} /></Typography>
                  <Typography>Số lần reset: {resetStats.used}/{resetStats.total}</Typography>
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
        </Dialog>

      {selectedHistoryId && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setSelectedHistoryId(null);
              setHistoryDetail(null);
              setHistoryDetailError(null);
            }}
          >
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="history-detail-title"
            >
              <div className="modal-header">
                <h2 id="history-detail-title" className="modal-title">
                  Chi tiết buổi điểm danh
                </h2>
                <button
                  className="modal-close"
                  onClick={() => {
                    setSelectedHistoryId(null);
                    setHistoryDetail(null);
                    setHistoryDetailError(null);
                  }}
                  aria-label="Đóng"
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                {historyDetailLoading && <div className="loading-row">Đang tải chi tiết...</div>}
                {historyDetailError && <div className="error-banner">⚠️ {historyDetailError}</div>}
                {historyDetail && !historyDetailLoading && !historyDetailError && (
                  <>
                    <div className="history-summary">
                      <div className="summary-item">
                        <span className="summary-label">Lớp</span>
                        <span className="summary-value">
                          {historyDetail.session.classId}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Môn học</span>
                        <span className="summary-value">
                          {historyDetail.session.subjectName || "--"}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Ngày</span>
                        <span className="summary-value">
                          {formatDateOrFallback(getSessionDisplayDate(historyDetail.session))}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Hình thức</span>
                        <span className="summary-value">
                          {sessionHasMode(historyDetail.session.type, "manual") ? "Thủ công" : "Tự động"}
                          </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Tỉ lệ tham dự</span>
                        <span className="summary-value attendance-ratio">
                          {computeRatio(historyDetail.summary)}%
                          <span style={{ marginLeft: 6, fontSize: '14px', color: '#A0AEC0' }}>
                            ({historyDetail.summary.present}/{historyDetail.summary.total})
                          </span>
                        </span>
                      </div>
                    </div>

                    

                    <div className="table-wrap">
                      <table className="detail-table">
                        <thead>
                          <tr>
                            <th>Mã SV</th>
                            <th>Họ tên</th>
                            <th>Trạng thái</th>
                            <th>Ghi chú</th>
                            <th className="text-right">Thời gian</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyDetail.records.length > 0 ? (
                            historyDetail.records.map((row) => {
                              const recordId = row.recordId;
                              const disabled = !recordId || updatingRecordId === recordId;
                              return (
                                <tr key={`${row.studentId}-${recordId ?? "noid"}`}>
                                  <td>{row.studentId}</td>
                                  <td>{row.fullName || "--"}</td>
                                  <td>
                                    <select
                                      className="status-select"
                                      value={row.status}
                                      disabled={disabled}
                                      onChange={(event) => {
                                        if (!recordId) return;
                                        const nextStatus = event.target.value as AttendanceStatus;
                                        patchHistoryRecord({
                                          sessionId: historyDetail.session.id,
                                          recordId,
                                          status: nextStatus,
                                          note: row.note ?? null,
                                        });
                                      }}
                                    >
                                      {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td>{row.note || <span className="empty-state">N/A</span>}</td>
                                  <td className="text-right">
                                    {row.markedAt ? formatVietnamTime(row.markedAt) : "--"}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="empty-state">
                                Không có bản ghi điểm danh
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
