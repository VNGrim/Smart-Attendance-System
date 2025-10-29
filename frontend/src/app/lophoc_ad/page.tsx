"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ClassItem = {
  id: string;
  code: string;
  name: string;
  subjectCode: string;
  subjectName: string;
  cohort: string;
  major?: string | null;
  teacherId?: string | null;
  teacher: string;
  teacherEmail?: string;
  students: number;
  status: "Đang hoạt động" | "Tạm nghỉ" | "Kết thúc";
};

const extractCohortDigits = (cohort: string) => {
  if (!cohort) return null;
  const match = cohort.toUpperCase().match(/(\d{2,})$/);
  return match ? match[1] : null;
};

const computeFallbackClassCode = (cohort: string, existing: ClassItem[]): string | null => {
  const digits = extractCohortDigits(cohort);
  if (!digits) return null;
  const prefix = `SE${digits}B`;
  const maxNumber = existing
    .filter((c) => typeof c.code === "string" && c.code.startsWith(prefix))
    .map((c) => {
      const suffix = c.code.slice(prefix.length);
      const parsed = parseInt(suffix, 10);
      return Number.isFinite(parsed) ? parsed : null;
    })
    .filter((value): value is number => value !== null)
    .reduce((max, current) => Math.max(max, current), 0);

  const nextNumber = maxNumber + 1;
  return `${prefix}${nextNumber}`;
};

const mergeExistingClasses = (classes: ClassItem[] | undefined | null, edit: ClassItem | null): ClassItem[] => {
  const base = Array.isArray(classes) ? classes : [];
  if (!edit) return base;
  return [...base.filter((item) => item.code !== edit.code), edit];
};

type StudentRow = { mssv: string; name: string; status: string; email: string };

type ClassFormValues = {
  name: string;
  code: string;
  subjectCode: string;
  subjectName: string;
  cohort: string;
  teacherId: string;
  major?: string | null;
  status: ClassItem["status"];
};

type ClassOptions = {
  teachers: { id: string; name: string; email?: string | null }[];
  cohorts: string[];
  subjects: Record<string, string>;
};

const SUBJECT_NAME_MAP: Record<string, string> = {
  PRF192: "Programming Fundamentals",
  CEA201: "Computer Organization and Architecture",
  MAE101: "Mathematics for Engineering",
  SSL101c: "Academic Skills for University Success",
  CSI106: "Introduction to Computer Science",
  SWP391: "Software development project",
  SWT301: "SWT301",
};

const DEFAULT_CLASS_OPTIONS: ClassOptions = {
  teachers: [],
  cohorts: [],
  subjects: SUBJECT_NAME_MAP,
};

const FALLBACK_CLASSES: ClassItem[] = [
  {
    id: "SE19B1",
    code: "SE19B1",
    name: SUBJECT_NAME_MAP.PRF192,
    subjectCode: "PRF192",
    subjectName: SUBJECT_NAME_MAP.PRF192,
    cohort: "K19",
    major: "CNTT",
    teacherId: null,
    teacher: "Nguyễn Văn A",
    teacherEmail: "a@uni.edu",
    students: 32,
    status: "Đang hoạt động",
  },
  {
    id: "SE19B2",
    code: "SE19B2",
    name: SUBJECT_NAME_MAP.CEA201,
    subjectCode: "CEA201",
    subjectName: SUBJECT_NAME_MAP.CEA201,
    cohort: "K19",
    major: "CNTT",
    teacherId: null,
    teacher: "Trần Thị B",
    teacherEmail: "b@uni.edu",
    students: 29,
    status: "Đang hoạt động",
  },
  {
    id: "SE20B1",
    code: "SE20B1",
    name: SUBJECT_NAME_MAP.CSI106,
    subjectCode: "CSI106",
    subjectName: SUBJECT_NAME_MAP.CSI106,
    cohort: "K20",
    major: "CNTT",
    teacherId: null,
    teacher: "Nguyễn Văn A",
    teacherEmail: "a@uni.edu",
    students: 25,
    status: "Kết thúc",
  },
];

const API_BASE = "http://localhost:8080/api/admin/classes";

const mapBackendClass = (input: any): ClassItem => {
  const rawCode = input?.code ?? input?.class_id ?? input?.id ?? "";
  const code = String(rawCode || "");
  const subjectCode = input?.subjectCode ?? input?.subject_code ?? "";
  const subjectName = input?.subjectName ?? input?.subject_name ?? "";
  const teacherName = input?.teacherName ?? input?.teacher_name ?? input?.teacher ?? "";
  const teacherEmail = input?.teacherEmail ?? input?.teacher_email ?? null;
  const teacherId = input?.teacherId ?? input?.teacher_id ?? null;

  return {
    id: code || String(input?.id ?? Math.random().toString(36).slice(2, 9)),
    code,
    name: input?.name ?? input?.class_name ?? subjectName ?? "",
    subjectCode: String(subjectCode),
    subjectName: subjectName ?? "",
    cohort: input?.cohort ?? "",
    major: input?.major ?? null,
    teacherId: teacherId ? String(teacherId) : null,
    teacher: teacherName ?? "",
    teacherEmail: teacherEmail ?? undefined,
    students: typeof input?.students === "number" ? input.students : input?.studentCount ?? 0,
    status: (input?.status as ClassItem["status"]) || "Đang hoạt động",
  };
};

const createEmptyClassForm = (options: ClassOptions): ClassFormValues => {
  const subjectKeys = options ? Object.keys(options.subjects || {}) : [];
  const defaultSubjectCode = subjectKeys[0] ?? "";
  const defaultSubjectName = defaultSubjectCode ? options?.subjects?.[defaultSubjectCode] ?? "" : "";
  const defaultTeacherId = options?.teachers?.[0]?.id ?? "";
  const defaultCohort = options?.cohorts?.[0] ?? "";

  return {
    name: defaultSubjectName,
    code: "",
    subjectCode: defaultSubjectCode,
    subjectName: defaultSubjectName,
    cohort: defaultCohort,
    teacherId: defaultTeacherId,
    major: undefined,
    status: "Đang hoạt động",
  };
};

type ClassModalProps = {
  open: boolean;
  edit: ClassItem | null;
  options: ClassOptions;
  existingClasses: ClassItem[];
  onClose: () => void;
  onSubmit: (values: ClassFormValues) => Promise<void> | void;
  onRequestCode?: (cohort: string) => Promise<string | null>;
};

const ClassModal = ({
  open,
  edit,
  options,
  existingClasses,
  onClose,
  onSubmit,
  onRequestCode,
}: ClassModalProps) => {
  const [values, setValues] = useState<ClassFormValues>(() => createEmptyClassForm(options));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastAutoCohortRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);

    if (edit) {
      setValues({
        name: edit.subjectName,
        code: edit.code,
        subjectCode: edit.subjectCode,
        subjectName: edit.subjectName,
        cohort: edit.cohort,
        teacherId: edit.teacherId || "",
        major: edit.major ?? undefined,
        status: edit.status,
      });
      return;
    }

    const initial = createEmptyClassForm(options);
    setValues(initial);

    if (initial.cohort) {
      const combinedExisting = mergeExistingClasses(existingClasses, edit);
      const fallback = computeFallbackClassCode(initial.cohort, combinedExisting);
      if (fallback) {
        setValues((prev) => ({ ...prev, code: fallback }));
        lastAutoCohortRef.current = initial.cohort;
      }
    }

    if (onRequestCode && initial.cohort) {
      let cancelled = false;
      onRequestCode(initial.cohort)
        .then((code) => {
          if (!cancelled && code) {
            setValues((prev) => ({ ...prev, code }));
            lastAutoCohortRef.current = initial.cohort;
          }
        })
        .catch((err) => console.error("prefetch class code error", err));
      return () => {
        cancelled = true;
      };
    }
  }, [open, edit, options, onRequestCode]);

  useEffect(() => {
    setValues((prev) => {
      const subjectName = options.subjects[prev.subjectCode] || prev.subjectName || "";
      return { ...prev, subjectName, name: subjectName };
    });
  }, [options.subjects]);

  useEffect(() => {
    if (!open || edit) return;

    setValues((prev) => {
      let changed = false;
      const next = { ...prev };

      if (options.cohorts.length) {
        const preferredCohort = prev.cohort && options.cohorts.includes(prev.cohort)
          ? prev.cohort
          : options.cohorts[0];
        if (preferredCohort !== prev.cohort) {
          next.cohort = preferredCohort;
          changed = true;
        }
      }

      if (options.teachers.length) {
        const preferredTeacher = prev.teacherId && options.teachers.some((t) => t.id === prev.teacherId)
          ? prev.teacherId
          : options.teachers[0].id;
        if (preferredTeacher !== prev.teacherId) {
          next.teacherId = preferredTeacher;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [options.cohorts, options.teachers, open, edit]);

  useEffect(() => {
    if (!open || edit || !onRequestCode) return;
    const cohort = values.cohort?.trim();
    if (!cohort) return;

    if (lastAutoCohortRef.current === cohort && values.code) return;

    let cancelled = false;
    onRequestCode(cohort)
      .then((code) => {
        if (!cancelled && code) {
          setValues((prev) => {
            if (prev.cohort !== cohort) return prev;
            return { ...prev, code };
          });
          lastAutoCohortRef.current = cohort;
        }
      })
      .catch((err) => console.error("generate class code error", err));

    return () => {
      cancelled = true;
    };
  }, [values.cohort, open, edit, onRequestCode]);

  const teacherName = useMemo(() => {
    if (values.teacherId) {
      const teacher = options.teachers.find((t) => t.id === values.teacherId);
      if (teacher) return teacher.name;
    }
    if (edit?.teacher) return edit.teacher;
    return "Chưa chọn";
  }, [options.teachers, values.teacherId, edit?.teacher]);

  const summary = useMemo(() => {
    return [
      { icon: "📚", label: "Mã môn", value: values.subjectCode || "Chưa nhập" },
      { icon: "📖", label: "Tên môn", value: values.subjectName || "Chưa có" },
      { icon: "🆔", label: "Mã lớp", value: values.code || "Chưa sinh" },
      { icon: "🎓", label: "Khóa", value: values.cohort || "Chưa chọn" },
      { icon: "👩‍🏫", label: "Giảng viên", value: teacherName },
      { icon: "✅", label: "Trạng thái", value: values.status },
    ];
  }, [values, teacherName]);

  const handleSubjectChange = (code: string) => {
    const normalized = code.trim().toUpperCase();
    const subjectName = options.subjects[normalized] || "";
    setValues((prev) => ({
      ...prev,
      subjectCode: normalized,
      subjectName,
      name: subjectName,
    }));
  };

  const handleTeacherChange = (id: string) => {
    setValues((prev) => ({ ...prev, teacherId: id }));
  };

  const handleCohortChange = async (cohort: string) => {
    setValues((prev) => ({ ...prev, cohort }));
    lastAutoCohortRef.current = null;
    if (!cohort || edit || !onRequestCode) return;
    try {
      const nextCode = await onRequestCode(cohort);
      if (nextCode) {
        setValues((prev) => ({ ...prev, code: nextCode }));
        lastAutoCohortRef.current = cohort;
        return;
      }
    } catch (err) {
      console.error("generate class code error", err);
    }
    const combinedExisting = mergeExistingClasses(existingClasses, edit);
    const fallback = computeFallbackClassCode(cohort, combinedExisting);
    if (fallback) {
      setValues((prev) => ({ ...prev, code: fallback }));
      lastAutoCohortRef.current = cohort;
    }
  };

  const subjectOptions = useMemo(() => Object.keys(options.subjects), [options.subjects]);
  const cohortOptions = useMemo(() => options.cohorts, [options.cohorts]);

  const handleSubmit = async () => {
    if (!values.subjectCode.trim()) {
      setError("Mã môn là bắt buộc");
      return;
    }
    if (!values.cohort) {
      setError("Vui lòng chọn khóa");
      return;
    }
    if (!values.code.trim()) {
      setError("Mã lớp chưa được sinh");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err: any) {
      console.error("submit class error", err);
      setError(err?.message || "Không thể lưu lớp học");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal={open}
      aria-hidden={!open}
      style={{ display: open ? "flex" : "none" }}
      onClick={onClose}
    >
      <div className="modal-content form-modal" onClick={(e)=>e.stopPropagation()}>
        <div className="modal-head">
          <div className="title">{edit?"Chỉnh sửa lớp":"Tạo lớp mới"}</div>
          <button className="icon-btn" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body form-grid">
          <div className="form-col primary">
            <div className="form-section">
              <div className="section-head">
                <div className="section-title">Thông tin lớp</div>
              </div>
              <div className="field-stack">
                <label className="label">Mã lớp *</label>
                <input
                  className="input"
                  value={values.code}
                  onChange={(e)=>setValues((prev)=>({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="SE19B1"
                />
                <label className="label">Mã môn *</label>
                <select className="input" value={values.subjectCode} onChange={(e)=>handleSubjectChange(e.target.value)}>
                  <option value="">-- Chọn mã môn --</option>
                  {subjectOptions.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-section">
              <div className="section-head">
                <div className="section-title">Tổ chức lớp học</div>
              </div>
              <div className="field-stack">
                <label className="label">Giảng viên phụ trách *</label>
                <select className="input" value={values.teacherId} onChange={(e)=>handleTeacherChange(e.target.value)}>
                  <option value="">-- Chọn giảng viên --</option>
                  {options.teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <label className="label">Khóa học *</label>
                <select className="input" value={values.cohort} onChange={(e)=>handleCohortChange(e.target.value)}>
                  <option value="">-- Chọn khóa --</option>
                  {cohortOptions.map((co) => (
                    <option key={co} value={co}>{co}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="form-col secondary">
            <div className="form-section soft">
              <div className="section-head">
                <div className="section-title">Tóm tắt nhanh</div>
              </div>
              <div className="summary-grid">
                {summary.map((item) => (
                  <div className="summary-pill" key={item.label}>
                    <span className="summary-icon" aria-hidden>{item.icon}</span>
                    <span className="summary-text">{`${item.label}: ${item.value}`}</span>
                  </div>
                ))}
              </div>
              {error && <div className="error-text" style={{ color: "#ef4444", fontSize: "0.85rem" }}>{error}</div>}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <div className="foot-left">* Thông tin bắt buộc</div>
          <div className="foot-right">
            <button className="qr-btn ghost" onClick={onClose} disabled={saving}>Hủy</button>
            <button className="qr-btn" onClick={handleSubmit} disabled={saving}>💾 {saving ? "Đang lưu..." : "Lưu"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminClassesPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount] = useState(1);
  const [search, setSearch] = useState("");
  const [filterMajor, setFilterMajor] = useState("Tất cả ngành");
  const [filterCohort, setFilterCohort] = useState("Tất cả khóa");
  const [filterTeacher, setFilterTeacher] = useState("Tất cả giảng viên");
  const [filterStatus, setFilterStatus] = useState("Tất cả trạng thái");
  const [options, setOptions] = useState<ClassOptions>(() => ({
    teachers: [],
    cohorts: [],
    subjects: SUBJECT_NAME_MAP,
  }));
  const [list, setList] = useState<ClassItem[]>(FALLBACK_CLASSES);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [sortKey, setSortKey] = useState<keyof ClassItem>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<ClassItem | null>(null);
  const [drawerStudents, setDrawerStudents] = useState<StudentRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState<ClassItem | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);

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

  const fetchOptions = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/options`, { credentials: "include" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (data?.data) {
        const teachers = Array.isArray(data.data.teachers)
          ? data.data.teachers.map((t: any) => ({
              id: String(t.id ?? t.teacher_id ?? ""),
              name: t.name ?? t.full_name ?? "",
              email: t.email ?? null,
            })).filter((t: any) => t.id && t.name)
          : [];

        const rawCohorts: string[] = Array.isArray(data.data.cohorts)
          ? data.data.cohorts
              .map((c: any) => {
                if (typeof c === "string") return c.trim();
                if (c && typeof c.code === "string") return c.code.trim();
                return "";
              })
              .filter((c: string): c is string => Boolean(c))
          : [];

        const cohorts = Array.from(new Set(rawCohorts)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        const subjects = data.data.subjects && Object.keys(data.data.subjects).length
          ? { ...SUBJECT_NAME_MAP, ...data.data.subjects }
          : SUBJECT_NAME_MAP;

        setOptions({
          teachers,
          cohorts,
          subjects,
        });
      }
    } catch (error) {
      console.error("fetch class options error", error);
      setOptions({ teachers: [], cohorts: [], subjects: SUBJECT_NAME_MAP });
    }
  }, []);

  const fetchClassList = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const resp = await fetch(API_BASE, { credentials: "include" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (Array.isArray(data?.data)) {
        const mapped = data.data.map(mapBackendClass);
        setList(mapped.length ? mapped : FALLBACK_CLASSES);
      }
    } catch (error) {
      console.error("fetch classes error", error);
      setList(FALLBACK_CLASSES);
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
    fetchClassList();
  }, [fetchOptions, fetchClassList]);

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

  const toggleSort = (key: keyof ClassItem) => {
    if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(true); }
  };

  const findTeacherName = useCallback((teacherId?: string | null) => {
    if (!teacherId) return "";
    const teacher = options.teachers.find((t) => t.id === teacherId);
    return teacher ? teacher.name : "";
  }, [options.teachers]);

  const filtered = useMemo(() => {
    const keyword = search.toLowerCase();
    let data = list.filter((c) =>
      c.code.toLowerCase().includes(keyword) ||
      c.name.toLowerCase().includes(keyword) ||
      (c.subjectName || "").toLowerCase().includes(keyword) ||
      (c.teacher || "").toLowerCase().includes(keyword) ||
      c.cohort.toLowerCase().includes(keyword)
    );
    if (filterMajor !== "Tất cả ngành") data = data.filter((c) => (c.major || "") === filterMajor);
    if (filterCohort !== "Tất cả khóa") data = data.filter((c) => c.cohort === filterCohort);
    if (filterTeacher !== "Tất cả giảng viên") data = data.filter((c) => (c.teacher || findTeacherName(c.teacherId)) === filterTeacher);
    if (filterStatus !== "Tất cả trạng thái") data = data.filter((c) => c.status === filterStatus);
    data.sort((a: any, b: any) => {
      const va = (a[sortKey] ?? (sortKey === "students" ? 0 : "")).toString().toLowerCase();
      const vb = (b[sortKey] ?? (sortKey === "students" ? 0 : "")).toString().toLowerCase();
      if (sortKey === "students") return sortAsc ? (a.students - b.students) : (b.students - a.students);
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return data;
  }, [list, search, filterMajor, filterCohort, filterTeacher, filterStatus, sortKey, sortAsc, findTeacherName]);

  const allSelected = selected.size > 0 && filtered.every((c) => selected.has(c.id));
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set()); else setSelected(new Set(filtered.map((c) => c.id)));
  };
  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const bulkDelete = () => {
    if (!confirm("Xóa các lớp đã chọn?")) return;
    setList((prev) => prev.filter((c) => !selected.has(c.id)));
    setSelected(new Set());
  };
  const bulkStatus = (status: ClassItem["status"]) => {
    setList((prev) => prev.map((c) => (selected.has(c.id) ? { ...c, status } : c)));
    setSelected(new Set());
  };

  const onOpenCreate = () => { setEdit(null); setModalOpen(true); };
  const onOpenEdit = (c: ClassItem) => { setEdit(c); setModalOpen(true); };

  const requestNextCode = useCallback(async (cohort: string) => {
    if (!cohort) return null;
    try {
      const resp = await fetch(`${API_BASE}/next-code?cohort=${encodeURIComponent(cohort)}`, {
        credentials: "include",
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      return data?.data?.code || null;
    } catch (error) {
      console.error("request class code error", error);
      return null;
    }
  }, []);

  const handleModalSubmit = useCallback(async (values: ClassFormValues) => {
    const payload: any = {
      name: values.subjectName,
      subjectCode: values.subjectCode,
      cohort: values.cohort,
      teacherId: values.teacherId || undefined,
      major: values.major || undefined,
      code: values.code || undefined,
      status: values.status,
    };

    try {
      let response;
      if (edit) {
        response = await fetch(`${API_BASE}/${encodeURIComponent(edit.code)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(API_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const record = mapBackendClass(data?.data || data);
      const teacherName = record.teacher || findTeacherName(record.teacherId);
      const merged: ClassItem = {
        ...record,
        teacher: teacherName,
        subjectName: record.subjectName || options.subjects[record.subjectCode] || record.subjectName,
      };

      setList((prev) => {
        const next = edit ? prev.map((c) => (c.code === edit.code ? merged : c)) : [merged, ...prev.filter((c) => c.code !== merged.code)];
        return next;
      });

      fetchClassList();

      setModalOpen(false);
      setEdit(null);
    } catch (error) {
      console.error("handle class modal submit error", error);
      throw error;
    }
  }, [edit, findTeacherName, options.subjects, fetchClassList]);

  const stats = useMemo(() => {
    const total = list.length;
    const active = list.filter(x=>x.status === "Đang hoạt động").length;
    const teachers = new Set(list.map(x=>x.teacher || x.teacherId || "")).size;
    const totalStudents = list.reduce((a,b)=>a + (b.students||0), 0);
    return { total, active, teachers, totalStudents };
  }, [list]);

  const anySelected = selected.size > 0;

  useEffect(() => {
    if (!statusMenuOpen) return;
    const handler = (event: MouseEvent) => {
      if (!statusMenuRef.current) return;
      if (!statusMenuRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [statusMenuOpen]);

  useEffect(() => {
    if (!anySelected) setStatusMenuOpen(false);
  }, [anySelected]);

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
          <Link href="/tongquan_ad" className="side-link" title="Dashboard">🏠 {!collapsed && "Dashboard"}</Link>
          <Link href="/thongbao_ad" className="side-link" title="Thông báo">📢 {!collapsed && "Thông báo"}</Link>
          <Link href="/sinhvien_ad" className="side-link" title="Sinh viên">👨‍🎓 {!collapsed && "Sinh viên"}</Link>
          <Link href="/giangvien_ad" className="side-link" title="Giảng viên">👩‍🏫 {!collapsed && "Giảng viên"}</Link>
          <Link href="/lophoc_ad" className="side-link active" title="Lớp học">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/lichhoc_ad" className="side-link" title="Lịch học">📅 {!collapsed && "Lịch học"}</Link>
          <Link href="/taikhoan_ad" className="side-link" title="Tài khoản">🔑 {!collapsed && "Tài khoản"}</Link>
          <Link href="/caidat_ad" className="side-link" title="Cấu hình">⚙️ {!collapsed && "Cấu hình"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="top-left">
          <div className="page-title">Quản lý Lớp học</div>
        </div>
        <div className="controls">
          <div className="search">
            <i className="fas fa-search" />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Tìm mã lớp, tên lớp, giảng viên, khóa" />
          </div>
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
      <section className="cards">
        <div className="card"><div className="card-title">📚 Tổng số lớp</div><div className="card-num">{stats.total}</div></div>
        <div className="card"><div className="card-title">🏫 Đang hoạt động</div><div className="card-num">{stats.active}</div></div>
        <div className="card"><div className="card-title">🧑‍🏫 Giảng viên phụ trách</div><div className="card-num">{stats.teachers}</div></div>
        <div className="card"><div className="card-title">🎓 Tổng sinh viên</div><div className="card-num">{stats.totalStudents}</div></div>
      </section>

      <div className="toolbar-sub">
        <div className="left">
          <button className="chip primary" onClick={onOpenCreate}>➕ Tạo lớp mới</button>
          <div
            className="status-menu"
            ref={statusMenuRef}
            style={{ position: "relative" }}
          >
            <button
              className="chip primary"
              disabled={!anySelected}
              onClick={() => setStatusMenuOpen((prev) => !prev)}
            >
              ⚙️ Cập nhật trạng thái
            </button>
            {statusMenuOpen && (
              <div
                className="status-dropdown"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  background: "#ffffff",
                  borderRadius: "10px",
                  boxShadow: "0 12px 24px rgba(15,23,42,0.18)",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  minWidth: "180px",
                  zIndex: 20,
                }}
              >
                {(["Đang hoạt động", "Tạm nghỉ", "Kết thúc"] as ClassItem["status"][]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => { bulkStatus(status); setStatusMenuOpen(false); }}
                    style={{
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="chip ghost" onClick={()=>alert("Nhập Excel/CSV")}>📥 Nhập</button>
          <button className="chip ghost" onClick={()=>alert("Xuất CSV/Excel")}>📤 Xuất</button>
          <button className="chip danger" disabled={!anySelected} onClick={bulkDelete}>🗑 Xóa</button>
        </div>
        <div className="right">{anySelected ? `${selected.size} lớp đã chọn` : ""}</div>
      </div>

      <div className="panel">
        <div className="table classes-table">
          {loadingClasses && (
            <div className="loading-row">Đang tải dữ liệu lớp học...</div>
          )}
          <div className="thead">
            <div><input type="checkbox" checked={anySelected && filtered.every(c=>selected.has(c.id))} onChange={() => { if (anySelected && filtered.every(c=>selected.has(c.id))) setSelected(new Set()); else setSelected(new Set(filtered.map(c=>c.id))); }} /></div>
            <div className="th" onClick={()=>toggleSort("code")}>Mã lớp</div>
            <div className="th" onClick={()=>toggleSort("name")}>Tên lớp</div>
            <div className="th" onClick={()=>toggleSort("cohort")}>Khóa</div>
            <div className="th" onClick={()=>toggleSort("major")}>Ngành</div>
            <div className="th" onClick={()=>toggleSort("teacher")}>Giảng viên phụ trách</div>
            <div className="th" onClick={()=>toggleSort("students")}>Số sinh viên</div>
            <div className="th" onClick={()=>toggleSort("status")}>Trạng thái</div>
            <div>Thao tác</div>
          </div>
          <div className="tbody">
            {filtered.map((c) => (
              <div className="trow" key={c.id} onClick={() => { setDrawer(c); setDrawerStudents([
                { mssv: "SE12345", name: "Nguyễn Minh Hào", status: "Hoạt động", email: "hao@fpt.edu.vn" },
                { mssv: "SE12346", name: "Trần Thị Huyền", status: "Hoạt động", email: "huyen@fpt.edu.vn" },
              ]); }}>
                <div><input type="checkbox" checked={selected.has(c.id)} onChange={(e)=>{e.stopPropagation(); toggleSelect(c.id);}} /></div>
                <div>{c.code}</div>
                <div>{c.name}</div>
                <div>{c.cohort}</div>
                <div>{c.major}</div>
                <div>{c.teacher}</div>
                <div>{c.students}</div>
                <div><span className={`status ${c.status}`.replace(/\s/g,"-")}>{c.status}</span></div>
                <div className="actions">
                  <button className="icon-btn" title="Xem" onClick={(e)=>{e.stopPropagation(); setDrawer(c);}}>👁</button>
                  <button className="icon-btn" title="Sửa" onClick={(e)=>{e.stopPropagation(); onOpenEdit(c);}}>✏️</button>
                  <button className="icon-btn" title="Xóa" onClick={(e)=>{e.stopPropagation(); if(confirm("Xóa lớp?")) setList(prev=>prev.filter(x=>x.id!==c.id));}}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {drawer && (
        <div className="drawer" onClick={() => setDrawer(null)}>
          <div className="drawer-panel wide" onClick={(e)=>e.stopPropagation()}>
            <div className="drawer-head">
              <div className="title">{drawer.name} ({drawer.code})</div>
              <button className="icon-btn" onClick={() => setDrawer(null)}>✖</button>
            </div>
            <div className="drawer-body grid2">
              <div>
                <div className="kv"><span className="k">Khóa</span><span className="v">{drawer.cohort}</span></div>
                <div className="kv"><span className="k">Ngành</span><span className="v">{drawer.major}</span></div>
                <div className="kv"><span className="k">Giảng viên</span><span className="v">{drawer.teacher} <span className="muted">({drawer.teacherEmail||"--"})</span></span></div>
                <div className="kv"><span className="k">Trạng thái</span><span className="v"><span className={`status ${drawer.status}`.replace(/\s/g,"-")}>{drawer.status}</span></span></div>
                <div className="section-title">Môn học</div>
                <div className="list small">
                  <div>Mã môn: {drawer.subjectCode || "Chưa cập nhật"}</div>
                </div>
                <div className="actions-row">
                  <button className="qr-btn" onClick={()=>{ setDrawer(null); onOpenEdit(drawer); }}>✏️ Chỉnh sửa</button>
                  <button className="qr-btn" onClick={()=>alert("Đổi giảng viên")}>👨‍🏫 Đổi giảng viên</button>
                  <button className="qr-btn" onClick={()=>alert("Thêm sinh viên")}>➕ Thêm sinh viên</button>
                  <button className="qr-btn" onClick={()=>{ if(confirm("Xóa lớp?")){ setList(prev=>prev.filter(x=>x.id!==drawer.id)); setDrawer(null);} }}>🗑 Xóa lớp</button>
                </div>
              </div>
              <div>
                <div className="section-title">Danh sách sinh viên</div>
                <div className="table mini">
                  <div className="thead mini">
                    <div>MSSV</div>
                    <div>Tên sinh viên</div>
                    <div>Trạng thái</div>
                    <div>Email</div>
                  </div>
                  <div className="tbody">
                    {drawerStudents.map(s => (
                      <div className="trow mini" key={s.mssv}>
                        <div>{s.mssv}</div>
                        <div>{s.name}</div>
                        <div>{s.status}</div>
                        <div>{s.email}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ClassModal
        open={modalOpen}
        edit={edit}
        options={options}
        existingClasses={list}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        onRequestCode={requestNextCode}
      />
    </Shell>
  );
}

