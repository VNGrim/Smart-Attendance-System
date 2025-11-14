"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Student, StudentOptions, mapBackendStudent } from "./studentUtils";

const DEFAULT_PASSWORD = "sinhvienfpt";

type AddStudentModalProps = {
  open: boolean;
  onClose: () => void;
  options: StudentOptions;
  student: Student | null;
  onSaved: (student: Student) => void;
};

type NextIdResponse = {
  data?: {
    nextId?: string;
  };
};

type LookupResponse = {
  student?: unknown;
};

type CreateStudentResponse = {
  student?: unknown;
  message?: string;
};

const findMajor = (options: StudentOptions, value?: string | null) => {
  if (!value) return options.majors[0] || "";
  const match = options.majors.find((major) => major === value);
  return match || value;
};

const findCohort = (options: StudentOptions, value?: string | null) => {
  if (!value) return options.cohorts[0] || "";
  const match = options.cohorts.find((cohort) => cohort === value);
  return match || value;
};

const AddStudentModal = ({ open, onClose, options, student, onSaved }: AddStudentModalProps) => {
  const [mssv, setMssv] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [passwordEditable, setPasswordEditable] = useState(false);
  const [cohort, setCohort] = useState("");
  const [major, setMajor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mssvTouchedRef = useRef(false);

  const summary = useMemo(() => ({
    cohort,
    status: student?.status ?? "Hoạt động",
    major,
  }), [cohort, student?.status, major]);

  const resetForm = useCallback(() => {
    mssvTouchedRef.current = false;
    setError(null);
    setSaving(false);
    setPasswordEditable(false);
    setPassword(DEFAULT_PASSWORD);

    if (student) {
      setMssv(student.mssv);
      setName(student.name);
      setEmail(student.email || "");
      setCohort(findCohort(options, student.cohort));
      setMajor(findMajor(options, student.major));
    } else {
      setMssv("");
      setName("");
      setEmail("");
      setCohort(findCohort(options));
      setMajor(findMajor(options));
    }
  }, [options, student]);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (!open || student) return;
    if (options.cohorts.length) {
      setCohort((current) => {
        if (!current || !options.cohorts.includes(current)) {
          return findCohort(options);
        }
        return current;
      });
    }
    if (options.majors.length) {
      setMajor((current) => {
        if (!current || !options.majors.includes(current)) {
          return findMajor(options);
        }
        return current;
      });
    }
  }, [open, student, options]);

  useEffect(() => {
    if (!open || student) return;
    if (!cohort) return;
    if (mssvTouchedRef.current && mssv.trim()) return;

    let cancelled = false;
    const controller = new AbortController();

    const fetchNextId = async () => {
      try {
        const resp = await fetch(`http://localhost:8080/api/admin/students/next-id?cohort=${encodeURIComponent(cohort)}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data: NextIdResponse = await resp.json();
        if (!cancelled && data?.data?.nextId && !mssvTouchedRef.current) {
          setMssv(data.data.nextId);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("fetch next student id error", err);
      }
    };

    fetchNextId();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, student, cohort, mssv]);

  const handleLookup = useCallback(async () => {
    if (!open || student) return;
    const trimmed = mssv.trim();
    if (!trimmed) return;
    try {
      const resp = await fetch(`http://localhost:8080/api/admin/students/lookup/${encodeURIComponent(trimmed)}`, {
        credentials: "include",
      });
      if (!resp.ok) return;
      const data: LookupResponse = await resp.json();
      if (data?.student) {
        const mapped = mapBackendStudent(data.student as Record<string, unknown>);
        setName(mapped.name);
        setEmail(mapped.email || "");
        setCohort(findCohort(options, mapped.cohort));
        setMajor(findMajor(options, mapped.major));
      }
    } catch (err) {
      console.error("lookup student info error", err);
    }
  }, [open, student, mssv, options]);

  // Tự sinh MSSV khi đổi khóa trong chế độ chỉnh sửa (nếu người dùng chưa tự sửa MSSV)
  useEffect(() => {
    if (!open || !student) return;
    if (!cohort) return;
    if (mssvTouchedRef.current && mssv.trim()) return;

    // Nếu khóa không đổi so với ban đầu thì không làm gì
    const originalCohort = findCohort(options, student.cohort);
    if (cohort === originalCohort) return;

    let cancelled = false;
    const controller = new AbortController();

    const fetchNextId = async () => {
      try {
        const resp = await fetch(`http://localhost:8080/api/admin/students/next-id?cohort=${encodeURIComponent(cohort)}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data: NextIdResponse = await resp.json();
        if (!cancelled && data?.data?.nextId && !mssvTouchedRef.current) {
          setMssv(data.data.nextId);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("fetch next student id error (edit)", err);
      }
    };

    fetchNextId();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, student, cohort, mssv, options]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError("Họ tên là bắt buộc");
      return;
    }
    if (!cohort) {
      setError("Vui lòng chọn khóa");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        mssv: mssv.trim() || undefined,
        fullName: name.trim(),
        email: email.trim() || undefined,
        cohort,
        major,
        // Khi chỉnh sửa, mật khẩu không thay đổi trừ khi sau này có form riêng
      };

      const url = student
        ? `http://localhost:8080/api/admin/students/${encodeURIComponent(student.mssv || student.id)}`
        : "http://localhost:8080/api/admin/students";
      const method = student ? "PUT" : "POST";

      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => null) as CreateStudentResponse | null;
        throw new Error(data?.message || `HTTP ${resp.status}`);
      }
      const data: CreateStudentResponse = await resp.json();
      if (data?.student) {
        onSaved(mapBackendStudent(data.student as Record<string, unknown>));
      } else {
        throw new Error("Phản hồi không hợp lệ từ máy chủ");
      }
    } catch (err: unknown) {
      console.error(student ? "update student error" : "create student error", err);
      const message = err instanceof Error && err.message ? err.message : "Không thể lưu sinh viên";
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [student, name, cohort, mssv, email, major, onSaved]);

  const cohortOptions = useMemo(() => options.cohorts, [options.cohorts]);
  const majorOptions = useMemo(() => options.majors, [options.majors]);

  return (
    <div
      className="modal"
      onClick={onClose}
      style={{
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        visibility: open ? "visible" : "hidden",
        transition: "opacity 0.2s ease",
      }}
      aria-hidden={!open}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="title">{student ? "Chỉnh sửa sinh viên" : "Thêm sinh viên"}</div>
          <button className="icon-btn" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body grid2">
          <div className="form-col primary">
            <div className="form-section">
              <div className="section-head">
                <div className="section-title">Thông tin cơ bản</div>
                <div className="section-subtitle">Các trường bắt buộc để tạo hồ sơ sinh viên</div>
              </div>
              <div className="field-stack">
                <label className="label">MSSV</label>
                <input
                  className="input"
                  value={mssv}
                  onChange={(e) => {
                    mssvTouchedRef.current = true;
                    setMssv(e.target.value);
                  }}
                  onBlur={handleLookup}
                  placeholder="SE12345"
                />
                <label className="label">Họ tên</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" />
                <label className="label">Email</label>
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@domain.com" />
                <div className="field-label-row">
                  <label className="label">Mật khẩu</label>
                  <span className="field-hint">Mặc định: &quot;{DEFAULT_PASSWORD}&quot;</span>
                </div>
                <div className="password-row">
                  <input
                    className="input"
                    type={passwordEditable ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={!passwordEditable}
                    placeholder={DEFAULT_PASSWORD}
                  />
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => {
                      setPasswordEditable((prev) => {
                        const next = !prev;
                        if (!next) {
                          setPassword(DEFAULT_PASSWORD);
                        }
                        return next;
                      });
                    }}
                    title={passwordEditable ? "Khóa chỉnh sửa" : "Chỉnh sửa mật khẩu"}
                  >
                    {passwordEditable ? "Lưu" : "Chỉnh sửa"}
                  </button>
                </div>
                <p className="hint-text">Bạn có thể thay đổi mật khẩu sau khi tạo tài khoản sinh viên.</p>
              </div>
            </div>
          </div>
          <div className="form-col secondary">
            <div className="form-section">
              <div className="section-head">
                <div className="section-title">Thông tin học tập</div>
                <div className="section-subtitle">Sắp xếp sinh viên vào lớp và cố vấn</div>
              </div>
              <div className="field-stack">
                <label className="label">Khóa</label>
                <select className="input" value={cohort} onChange={(e) => {
                  mssvTouchedRef.current = false;
                  setCohort(e.target.value);
                  setMssv("");
                }}>
                  {cohortOptions.map((co) => (
                    <option key={co} value={co}>{co}</option>
                  ))}
                </select>
                <label className="label">Ngành</label>
                <select className="input" value={major} onChange={(e) => setMajor(e.target.value)}>
                  {majorOptions.map((mjr) => (
                    <option key={mjr} value={mjr}>{mjr}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-section soft">
              <div className="section-head">
                <div className="section-title">Tóm tắt nhanh</div>
                <div className="section-subtitle">Kiểm tra lại các thiết lập trước khi lưu</div>
              </div>
              <div className="summary-grid">
                <div className="summary-pill">✅ Trạng thái mặc định: {summary.status}</div>
                <div className="summary-pill">🧑‍🎓 Sinh viên: {name || "Chưa nhập"}</div>
                <div className="summary-pill">🎓 Khóa: {summary.cohort}</div>
                <div className="summary-pill">🆔 MSSV: {mssv || "Chưa có"}</div>
                <div className="summary-pill">🧑‍🎓 Ngành: {summary.major}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="qr-btn" onClick={onClose}>Hủy</button>
          <button className="qr-btn" onClick={handleSubmit} disabled={saving}>💾 {saving ? "Đang lưu..." : "Lưu"}</button>
          {error && <span className="error-text" style={{ marginLeft: "1rem" }}>{error}</span>}
        </div>
      </div>
    </div>
  );
};

export default AddStudentModal;
