"use client";

import Link from "next/link";
import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_IDS = [1, 2, 3, 4];
const SLOT_DEFAULT_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: "07:00", end: "09:15" },
  2: { start: "09:30", end: "11:45" },
  3: { start: "12:30", end: "14:45" },
  4: { start: "15:00", end: "17:15" },
};
const WEEK_OPTIONS = [
  { label: "29/09 - 05/10", value: "29/09 - 05/10" },
  { label: "06/10 - 12/10", value: "06/10 - 12/10" },
  { label: "13/10 - 19/10", value: "13/10 - 19/10" },
];
const API_ROOT = "http://localhost:8080/api/lichhoc/admin";
const API_SCHEDULE = `${API_ROOT}/schedule`;
const API_OPTIONS = `${API_ROOT}/options`;
const API_AUTO = `${API_ROOT}/schedule/auto`;
const API_AUTO_APPLY = `${API_ROOT}/schedule/auto/apply`;
const API_COPY = `${API_ROOT}/schedule/copy`;
const API_DELETE_WEEK = `${API_ROOT}/schedule/week`;
const API_EXPORT = `${API_ROOT}/schedule/export`;

type ScheduleCell = {
  classId: string;
  className: string;
  subjectName: string;
  teacherName: string;
  room: string;
  startTime: string | null;
  endTime: string | null;
};

type FlatRow = {
  day: string;
  slot_id: number;
  start_time: string | null;
  end_time: string | null;
  room: string;
  class_id: string;
  class_name: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
};

type ClassOption = {
  id: string;
  name: string;
  subject: string;
  teacherId: string | null;
  teacherName: string | null;
  room?: string | null;
};

type TeacherOption = {
  id: string;
  name: string;
  subject?: string | null;
};

type RoomOption = {
  code: string;
  name: string;
  capacity: number | null;
  location: string | null;
};

type ScheduleOptions = {
  classes: ClassOption[];
  teachers: TeacherOption[];
  rooms: RoomOption[];
  days: string[];
  slots: number[];
};

type AutoPlanItem = {
  class_id: string;
  class_name: string;
  subject_name: string | null;
  teacher_id: string | null;
  teacher_name: string | null;
  room: string | null;
  day: string;
  slot_id: number;
  room_name?: string | null;
};

function getSubjectColor(name: string) {
  const colors = [
    "card-blue",
    "card-teal",
    "card-purple",
    "card-green",
    "card-orange",
    "card-pink",
    "card-indigo",
    "card-red",
  ];
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function getSubjectIcon(name: string) {
  if (/web/i.test(name)) return "🌐";
  if (/database|db/i.test(name)) return "🗄️";
  if (/algorithm|alg/i.test(name)) return "🧮";
  if (/network|net/i.test(name)) return "🌐";
  if (/ai|machine/i.test(name)) return "🤖";
  if (/mobile|app/i.test(name)) return "📱";
  if (/game/i.test(name)) return "🎮";
  if (/security|sec/i.test(name)) return "🔒";
  return "📚";
}

const DEFAULT_WEEK = WEEK_OPTIONS[0].value;

export default function AdminSchedulePage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("2025");
  const [week, setWeek] = useState(DEFAULT_WEEK);
  const [options, setOptions] = useState<ScheduleOptions | null>(null);
  const [grid, setGrid] = useState<Record<number, Record<string, ScheduleCell | null>>>({});
  const [flat, setFlat] = useState<FlatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalCreate, setModalCreate] = useState(false);
  const [modalAuto, setModalAuto] = useState(false);
  const [autoSelection, setAutoSelection] = useState<string[]>([]);
  const [autoPlan, setAutoPlan] = useState<AutoPlanItem[]>([]);
  const [autoLoading, setAutoLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    classId: "",
    subjectName: "",
    teacherId: "",
    teacherName: "",
    room: "",
    day: DAYS[0],
    slot: SLOT_IDS[0],
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<null | {
    message: string;
    onConfirm: () => Promise<void> | void;
  }>(null);
  const closeConfirm = useCallback(() => setPendingConfirm(null), []);
  const executeConfirm = useCallback(async () => {
    if (!pendingConfirm) return;
    try {
      await pendingConfirm.onConfirm();
    } finally {
      setPendingConfirm(null);
    }
  }, [pendingConfirm]);

  const hydrateGrid = useCallback((rows: FlatRow[]) => {
    const nextGrid: Record<number, Record<string, ScheduleCell | null>> = {};
    SLOT_IDS.forEach((slot) => {
      nextGrid[slot] = {};
      DAYS.forEach((day) => {
        nextGrid[slot][day] = null;
      });
    });
    rows.forEach((row) => {
      const dayKey = row.day;
      const slotId = row.slot_id;
      if (!SLOT_IDS.includes(slotId) || !DAYS.includes(dayKey)) return;
      nextGrid[slotId][dayKey] = {
        classId: row.class_id,
        className: row.class_name,
        subjectName: row.subject_name,
        teacherName: row.teacher_name,
        room: row.room,
        startTime: row.start_time,
        endTime: row.end_time,
      };
    });
    setGrid(nextGrid);
    setFlat(rows);
  }, []);

  const loadSchedule = useCallback(async (weekKey: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("week", weekKey);
      const resp = await fetch(`${API_SCHEDULE}?${params.toString()}`, { credentials: "include" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (!json?.success) throw new Error(json?.message || "Không thể lấy dữ liệu lịch học");
      hydrateGrid(json.data?.flat || []);
    } catch (err: any) {
      setError(err?.message || "Lỗi tải dữ liệu");
      hydrateGrid([]);
    } finally {
      setLoading(false);
    }
  }, [hydrateGrid]);

  const reload = useCallback(() => loadSchedule(week), [loadSchedule, week]);

  useEffect(() => {
    let mounted = true;

    async function fetchOptions() {
      try {
        const resp = await fetch(API_OPTIONS, { credentials: "include" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!json?.success) throw new Error(json?.message || "Không thể tải dữ liệu đối tượng");
        if (!mounted) return;
        setOptions(json.data as ScheduleOptions);
      } catch (err: any) {
        console.error("schedule options error", err);
      }
    }

    fetchOptions().catch(() => {});
    loadSchedule(week).catch(() => {});

    try {
      const saved = localStorage.getItem("sas_settings");
      if (saved) {
        const s = JSON.parse(saved);
        document.documentElement.style.colorScheme = s.themeDark ? "dark" : "light";
      }
    } catch {}

    const handler = (e: any) => {
      const s = e?.detail;
      if (!s) return;
      document.documentElement.style.colorScheme = s.themeDark ? "dark" : "light";
    };
    window.addEventListener("sas_settings_changed" as any, handler);

    return () => {
      mounted = false;
      window.removeEventListener("sas_settings_changed" as any, handler);
    };
  }, [loadSchedule, week]);

  const slotTimeById = useMemo(() => {
    const map: Record<number, { start: string; end: string }> = {};
    for (const row of flat) {
      if (row.slot_id && !map[row.slot_id]) {
        map[row.slot_id] = {
          start: row.start_time?.slice(0, 5) || "",
          end: row.end_time?.slice(0, 5) || "",
        };
      }
    }
    return map;
  }, [flat]);

  const filteredGrid = useMemo(() => {
    if (!search.trim()) return grid;
    const keyword = search.toLowerCase();
    const next: typeof grid = {};
    SLOT_IDS.forEach((slot) => {
      next[slot] = {} as Record<string, ScheduleCell | null>;
      DAYS.forEach((day) => {
        const cell = grid?.[slot]?.[day] || null;
        if (!cell) {
          next[slot][day] = null;
          return;
        }
        const joined = `${cell.className} ${cell.subjectName} ${cell.teacherName} ${cell.room}`.toLowerCase();
        next[slot][day] = joined.includes(keyword) ? cell : null;
      });
    });
    return next;
  }, [grid, search]);

  const previousWeek = useMemo(() => {
    const index = WEEK_OPTIONS.findIndex((opt) => opt.value === week);
    if (index > 0) return WEEK_OPTIONS[index - 1].value;
    return null;
  }, [week]);

  const openCreateModal = useCallback(() => {
    const firstClass = options?.classes?.[0];
    setCreateForm({
      classId: firstClass?.id || "",
      subjectName: firstClass?.subject || "",
      teacherId: firstClass?.teacherId || "",
      teacherName: firstClass?.teacherName || "",
      room: firstClass?.room || "",
      day: DAYS[0],
      slot: SLOT_IDS[0],
    });
    setModalCreate(true);
  }, [options]);

  const closeCreateModal = useCallback(() => {
    setModalCreate(false);
  }, []);

  const closeAutoModal = useCallback(() => {
    setModalAuto(false);
    setAutoSelection([]);
    setAutoPlan([]);
    setAutoLoading(false);
  }, []);

  const handleDeleteWeek = useCallback(async () => {
    setPendingConfirm({
      message: "Xóa toàn bộ lịch tuần này?",
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const params = new URLSearchParams();
          params.set("week", week);
          const resp = await fetch(`${API_DELETE_WEEK}?${params.toString()}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const json = await resp.json();
          if (!json?.success) throw new Error(json?.message || "Không thể xóa lịch tuần này");
          await reload();
          toast.success("Đã xóa lịch tuần này");
        } catch (err: any) {
          toast.error(err?.message || "Xóa thất bại");
        } finally {
          setActionLoading(false);
        }
      },
    });
  }, [week, reload]);

  const handleCopyWeek = useCallback(async () => {
    if (!previousWeek) {
      toast.error("Không tìm thấy tuần trước để sao chép");
      return;
    }
    setPendingConfirm({
      message: `Sao chép từ tuần "${previousWeek}" sang "${week}"?`,
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const resp = await fetch(API_COPY, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromWeek: previousWeek, toWeek: week }),
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const json = await resp.json();
          if (!json?.success) throw new Error(json?.message || "Không thể sao chép lịch");
          await reload();
          toast.success("Đã sao chép lịch tuần trước");
        } catch (err: any) {
          toast.error(err?.message || "Sao chép thất bại");
        } finally {
          setActionLoading(false);
        }
      },
    });
  }, [previousWeek, week, reload]);

  const handleExport = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("week", week);
      params.set("format", "csv");
      const resp = await fetch(`${API_EXPORT}?${params.toString()}`, { credentials: "include" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `schedule-${week}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Đã tải xuống CSV lịch học");
    } catch (err: any) {
      toast.error(err?.message || "Không thể xuất lịch");
    }
  }, [week]);

  const handleCreateSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!createForm.classId) {
      toast.error("Vui lòng chọn lớp học");
      return;
    }
    try {
      setActionLoading(true);
      const selectedClass = options?.classes.find((cls) => cls.id === createForm.classId);
      const payload = {
        weekKey: week,
        day: createForm.day,
        slotId: createForm.slot,
        classId: createForm.classId,
        subjectName: createForm.subjectName || selectedClass?.subject || "",
        teacherId: createForm.teacherId || selectedClass?.teacherId || "",
        teacherName: createForm.teacherName || selectedClass?.teacherName || "",
        room: createForm.room || selectedClass?.room || "",
        roomName: createForm.room || selectedClass?.room || "",
      };
      const resp = await fetch(API_SCHEDULE, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (!json?.success) throw new Error(json?.message || "Không thể tạo lịch");
      await reload();
      closeCreateModal();
      toast.success("Đã tạo lịch thành công");
    } catch (err: any) {
      toast.error(err?.message || "Tạo lịch thất bại");
    } finally {
      setActionLoading(false);
    }
  }, [createForm, options, week, reload, closeCreateModal]);

  const handleAutoGenerate = useCallback(async () => {
    if (!autoSelection.length) {
      toast.error("Chọn ít nhất một lớp để xếp lịch");
      return;
    }
    try {
      setAutoLoading(true);
      const resp = await fetch(API_AUTO, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekKey: week, classIds: autoSelection }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (!json?.success) throw new Error(json?.message || "Không thể tạo gợi ý");
      const plan = (json.data?.plan || []) as AutoPlanItem[];
      setAutoPlan(plan);
      if (!plan.length) {
        toast("Chưa tìm thấy slot phù hợp cho các lớp đã chọn", { icon: "ℹ️" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Không thể xếp lịch tự động");
    } finally {
      setAutoLoading(false);
    }
  }, [autoSelection, week]);

  const handleAutoApply = useCallback(async () => {
    if (!autoPlan.length) {
      toast.error("Không có gợi ý để áp dụng");
      return;
    }
    try {
      setAutoLoading(true);
      const resp = await fetch(API_AUTO_APPLY, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekKey: week,
          allocations: autoPlan.map((item) => ({
            ...item,
            room_name: item.room_name || item.room,
          })),
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (!json?.success) throw new Error(json?.message || "Không thể áp dụng gợi ý");
      await reload();
      closeAutoModal();
      toast.success("Đã áp dụng lịch tự động");
    } catch (err: any) {
      toast.error(err?.message || "Không thể áp dụng gợi ý");
    } finally {
      setAutoLoading(false);
    }
  }, [autoPlan, week, reload, closeAutoModal]);

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Shell collapsed={collapsed} setCollapsed={setCollapsed} router={router} search={search} setSearch={setSearch}>
        <div className="schedule-shell">
        <div className="filters" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12 }}>
            <select className="select" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
            <select className="select" value={week} onChange={(e) => setWeek(e.target.value)}>
              {WEEK_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div className="actions-bar">
            <button className="btn-primary" onClick={openCreateModal} disabled={!options?.classes.length}>
              ➕ Thêm lịch học
            </button>
            <button className="btn-outline" onClick={() => setModalAuto(true)} disabled={!options?.classes.length}>
              ⚙️ Tự động xếp lịch
            </button>
            <button className="btn-danger" onClick={handleDeleteWeek} disabled={actionLoading}>
              🧹 Xóa tuần này
            </button>
            <button className="btn-outline" onClick={handleCopyWeek} disabled={actionLoading || !previousWeek}>
              📋 Sao chép tuần trước
            </button>
            <button className="btn-outline" onClick={handleExport}>
              📤 Xuất lịch
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Đang tải dữ liệu lịch học...</div>
        ) : error ? (
          <div className="empty-state empty-state-error">{error}</div>
        ) : (
          <>
            <div className="grid" style={{ marginBottom: 6 }}>
              <div></div>
              {DAYS.map((day) => (
                <div key={day} className="col-header">{day}</div>
              ))}
            </div>
            <div className="grid">
              {SLOT_IDS.map((slot) => (
                <Fragment key={slot}>
                  <div className="row-header">
                    <div className="slot-badge">Slot {slot}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      {(slotTimeById[slot]?.start || SLOT_DEFAULT_TIMES[slot]?.start || "--:--")} - {(slotTimeById[slot]?.end || SLOT_DEFAULT_TIMES[slot]?.end || "--:--")}
                    </div>
                  </div>
                  {DAYS.map((day) => {
                    const cell = filteredGrid?.[slot]?.[day] || null;
                    return (
                      <div key={`${day}-${slot}`} className="cell">
                        {cell ? (
                          <>
                            <div className={`class-card ${getSubjectColor(cell.className)}`}>
                              <div style={{ fontSize: 16 }}>{getSubjectIcon(cell.className)}</div>
                              <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.15, textShadow: "0 1px 0 rgba(0,0,0,0.15)" }}>{cell.className}</div>
                              <div className="class-time" style={{ fontSize: 12 }}>
                                {cell.startTime?.slice(0, 5)} - {cell.endTime?.slice(0, 5)}
                              </div>
                              <div className="class-lecturer" style={{ fontSize: 12 }}>{cell.teacherName}</div>
                              {cell.room && (
                                <div className="class-room" style={{ fontSize: 12 }}>Phòng {cell.room}</div>
                              )}
                            </div>
                            <div className="pop">
                              <h4>{cell.className}</h4>
                              <p>
                                <strong>Thời gian:</strong> {cell.startTime?.slice(0, 5)} - {cell.endTime?.slice(0, 5)}
                              </p>
                              <p>
                                <strong>Giảng viên:</strong> {cell.teacherName}
                              </p>
                              {cell.room && (
                                <p>
                                  <strong>Phòng:</strong> {cell.room}
                                </p>
                              )}
                            </div>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </>
        )}
      </div>

      {modalCreate && (
        <Modal onClose={closeCreateModal} title="Thêm lịch học">
          <form className="schedule-form" onSubmit={handleCreateSubmit}>
            <div className="form-group">
              <label>Lớp</label>
              <select
                value={createForm.classId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  const cls = options?.classes.find((c) => c.id === nextId);
                  setCreateForm((prev) => ({
                    ...prev,
                    classId: nextId,
                    subjectName: cls?.subject || prev.subjectName,
                    teacherId: cls?.teacherId || prev.teacherId,
                    teacherName: cls?.teacherName || prev.teacherName,
                    room: cls?.room || prev.room,
                  }));
                }}
              >
                <option value="">-- Chọn lớp --</option>
                {options?.classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.id} - {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Môn học</label>
                <input
                  value={createForm.subjectName}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, subjectName: e.target.value }))}
                  placeholder="Tên môn"
                />
              </div>
              <div className="form-group">
                <label>Slot</label>
                <select value={createForm.slot} onChange={(e) => setCreateForm((prev) => ({ ...prev, slot: Number(e.target.value) }))}>
                  {SLOT_IDS.map((slot) => (
                    <option key={slot} value={slot}>
                      Slot {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Ngày</label>
                <select value={createForm.day} onChange={(e) => setCreateForm((prev) => ({ ...prev, day: e.target.value }))}>
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Phòng</label>
                <input
                  value={createForm.room}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, room: e.target.value }))}
                  placeholder="VD: A201"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Giảng viên</label>
                <select
                  value={createForm.teacherId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const teacher = options?.teachers.find((t) => t.id === id);
                    setCreateForm((prev) => ({
                      ...prev,
                      teacherId: id,
                      teacherName: teacher?.name || "",
                    }));
                  }}
                >
                  <option value="">-- Chọn --</option>
                  {options?.teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tên giảng viên</label>
                <input value={createForm.teacherName} onChange={(e) => setCreateForm((prev) => ({ ...prev, teacherName: e.target.value }))} />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-outline" onClick={closeCreateModal}>
                Hủy
              </button>
              <button type="submit" className="btn-primary" disabled={actionLoading}>
                {actionLoading ? "Đang lưu..." : "Lưu lịch"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modalAuto && (
        <Modal onClose={closeAutoModal} title="Tự động xếp lịch">
          <div className="auto-body">
            <div className="form-group">
              <label>Chọn lớp cần xếp</label>
              <select
                multiple
                value={autoSelection}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                  setAutoSelection(selected);
                }}
                style={{ height: 160 }}
              >
                {options?.classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.id} - {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions" style={{ justifyContent: "flex-end" }}>
              <button className="btn-outline" onClick={() => {
                setAutoSelection([]);
                setAutoPlan([]);
              }}>
                Xóa chọn
              </button>
              <button className="btn-primary" onClick={handleAutoGenerate} disabled={autoLoading}>
                {autoLoading ? "Đang tính..." : "Tạo gợi ý"}
              </button>
            </div>

            {autoPlan.length > 0 ? (
              <div className="auto-preview">
                <div className="preview-header">
                  <div>🌐 Gợi ý xếp lịch</div>
                  <button className="btn-primary" onClick={handleAutoApply} disabled={autoLoading}>
                    {autoLoading ? "Đang áp dụng..." : "Áp dụng lịch"}
                  </button>
                </div>
                <div className="preview-table">
                  <div className="preview-row preview-header-row">
                    <span>Lớp</span>
                    <span>Slot</span>
                    <span>Ngày</span>
                    <span>Giảng viên</span>
                    <span>Phòng</span>
                  </div>
                  {autoPlan.map((item, idx) => (
                    <div className="preview-row" key={`${item.class_id}-${item.day}-${item.slot_id}-${idx}`}>
                      <span>{item.class_id}</span>
                      <span>Slot {item.slot_id}</span>
                      <span>{item.day}</span>
                      <span>{item.teacher_name || "--"}</span>
                      <span>{item.room || "--"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-preview">Chưa có gợi ý – hãy chọn lớp và nhấn "Tạo gợi ý".</div>
            )}
          </div>
        </Modal>
      )}
      </Shell>

      {pendingConfirm && (
        <ConfirmDialog
          message={pendingConfirm.message}
          onCancel={closeConfirm}
          onConfirm={executeConfirm}
          loading={actionLoading}
        />
      )}
    </>
  );
}

type ShellProps = {
  collapsed: boolean;
  setCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
  router: ReturnType<typeof useRouter>;
  search: string;
  setSearch: (value: string) => void;
  children: ReactNode;
};

function Shell({ collapsed, setCollapsed, router, search, setSearch, children }: ShellProps) {
  return (
    <div className={`layout ${collapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="side-header">
          <button
            className="collapse-btn"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? "Mở rộng" : "Thu gọn"}
          >
            {collapsed ? "⮞" : "⮜"}
          </button>
          {!collapsed && <div className="side-name">Smart Attendance</div>}
        </div>
        <nav className="side-nav">
          <Link href="/tongquan_ad" className="side-link" title="Dashboard">
            🏠 {!collapsed && "Dashboard"}
          </Link>
          <Link href="/thongbao_ad" className="side-link" title="Thông báo">
            📢 {!collapsed && "Thông báo"}
          </Link>
          <Link href="/sinhvien_ad" className="side-link" title="Sinh viên">
            👨‍🎓 {!collapsed && "Sinh viên"}
          </Link>
          <Link href="/giangvien_ad" className="side-link" title="Giảng viên">
            👩‍🏫 {!collapsed && "Giảng viên"}
          </Link>
          <Link href="/lophoc_ad" className="side-link" title="Lớp học">
            🏫 {!collapsed && "Lớp học"}
          </Link>
          <Link href="/lichhoc_ad" className="side-link active" title="Lịch học">
            📅 {!collapsed && "Lịch học"}
          </Link>
          <Link href="/taikhoan_ad" className="side-link" title="Tài khoản">
            🔑 {!collapsed && "Tài khoản"}
          </Link>
          <Link href="/caidat_ad" className="side-link" title="Cấu hình">
            ⚙️ {!collapsed && "Cấu hình"}
          </Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="welcome">
          <div className="hello">Bảng lịch lớp học</div>
          <div className="date">Hôm nay: {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}</div>
        </div>
        <div className="controls">
          <div className="search">
            <i className="fas fa-search" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm lớp, môn, giảng viên, phòng" />
          </div>
          <button className="qr-btn" onClick={async () => {
            if (confirm("Bạn có chắc muốn đăng xuất?")) {
              try {
                await fetch("http://localhost:8080/api/auth/logout", {
                  method: "POST",
                  credentials: "include",
                });
              } catch {}
              try {
                localStorage.removeItem("sas_user");
              } catch {}
              router.push("/login");
            }
          }}>
            🚪 Đăng xuất
          </button>
        </div>
      </header>

      <main className="main">{children}</main>
    </div>
  );
}

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

type ConfirmDialogProps = {
  message: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

function ConfirmDialog({ message, onCancel, onConfirm, loading }: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop" role="alertdialog" aria-modal="true">
      <div className="modal-content confirm-modal">
        <div className="modal-title">Xác nhận</div>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="btn-outline" onClick={onCancel} disabled={loading}>
            Hủy
          </button>
          <button className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Đang xử lý..." : "Đồng ý"}
          </button>
        </div>
      </div>
    </div>
  );
}
