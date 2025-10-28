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

const findClassId = (options: StudentOptions, value?: string | null) => {
  if (!value) return options.classes[0]?.id || "";
  const match = options.classes.find((cls) => cls.id === value || cls.name === value);
  return match?.id || value;
};

const findAdvisorName = (options: StudentOptions, value?: string | null) => {
  if (!value) return options.advisors[0]?.name || "";
  const match = options.advisors.find((adv) => adv.id === value || adv.name === value);
  return match?.name || value;
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
  const [classId, setClassId] = useState("");
  const [cohort, setCohort] = useState("");
  const [major, setMajor] = useState("");
  const [advisor, setAdvisor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mssvTouchedRef = useRef(false);

  const summary = useMemo(() => ({
    advisor,
    cohort,
    status: student?.status ?? "Hoạt động",
    classLabel: options.classes.find((cls) => cls.id === classId)?.name || classId,
    major,
  }), [advisor, cohort, student?.status, options.classes, classId, major]);

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
      setClassId(findClassId(options, student.className));
      setCohort(findCohort(options, student.cohort));
      setMajor(findMajor(options, student.major));
      setAdvisor(findAdvisorName(options, student.advisor));
    } else {
      setMssv("");
      setName("");
      setEmail("");
      setClassId(findClassId(options));
      setCohort(findCohort(options));
      setMajor(findMajor(options));
      setAdvisor(findAdvisorName(options));
    }
  }, [options, student]);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

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
        const data = await resp.json();
        if (!cancelled && data?.data?.nextId && !mssvTouchedRef.current) {
          setMssv(data.data.nextId);
        }
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
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
      const data = await resp.json();
      if (data?.student) {
        const mapped = mapBackendStudent(data.student);
        setName(mapped.name);
        setEmail(mapped.email || "");
        setClassId(findClassId(options, mapped.className));
        setCohort(findCohort(options, mapped.cohort));
        setMajor(findMajor(options, mapped.major));
        setAdvisor(findAdvisorName(options, mapped.advisor));
      }
    } catch (err) {
      console.error("lookup student info error", err);
    }
  }, [open, student, mssv, options]);

  const handleSubmit = useCallback(async () => {
    if (student) {
      setError("Chức năng chỉnh sửa đang được phát triển.");
      return;
    }

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
        className: classId,
        major,
        advisor,
        password: passwordEditable ? password : undefined,
      };

      const resp = await fetch("http://localhost:8080/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        throw new Error(data?.message || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (data?.student) {
        onSaved(mapBackendStudent(data.student));
      } else {
        throw new Error("Phản hồi không hợp lệ từ máy chủ");
      }
    } catch (err: any) {
      console.error("create student error", err);
      setError(err.message || "Không thể lưu sinh viên");
    } finally {
      setSaving(false);
    }
  }, [student, name, cohort, mssv, email, classId, major, advisor, passwordEditable, password, onSaved]);

  const classOptions = useMemo(() => options.classes, [options.classes]);
  const cohortOptions = useMemo(() => options.cohorts, [options.cohorts]);
  const advisorOptions = useMemo(() => options.advisors, [options.advisors]);
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
                  <span className="field-hint">Mặc định: "{DEFAULT_PASSWORD}"</span>
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
                <div className="grid-2">
                  <div>
                    <label className="label">Lớp</label>
                    <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
                      {classOptions.map((cls) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Khóa</label>
                    <select className="input" value={cohort} onChange={(e) => {
                      mssvTouchedRef.current = true;
                      setCohort(e.target.value);
                    }}>
                      {cohortOptions.map((co) => (
                        <option key={co} value={co}>{co}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="label">Ngành</label>
                <select className="input" value={major} onChange={(e) => setMajor(e.target.value)}>
                  {majorOptions.map((mjr) => (
                    <option key={mjr} value={mjr}>{mjr}</option>
                  ))}
                </select>
                <label className="label">Giảng viên phụ trách</label>
                <select className="input" value={advisor} onChange={(e) => setAdvisor(e.target.value)}>
                  {advisorOptions.map((adv) => (
                    <option key={adv.id} value={adv.name}>{adv.name}</option>
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
                <div className="summary-pill">👨‍🏫 Giảng viên: {summary.advisor}</div>
                <div className="summary-pill">🎓 Khóa: {summary.cohort}</div>
                <div className="summary-pill">🏫 Lớp: {summary.classLabel}</div>
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
