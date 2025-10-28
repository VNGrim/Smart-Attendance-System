"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lecturer, LecturerStatus, LECTURER_STATUSES } from "./lecturerUtils";

type AddLecturerModalProps = {
  open: boolean;
  onClose: () => void;
  lecturer: Lecturer | null;
  existingClasses: string[];
  onSaved: (payload: { lecturer: Lecturer; classes: string[] }) => void;
};

const DEFAULT_PASSWORD = "giangvienfpt";

const SUBJECT_OPTIONS = [
  { code: "PRJ301", name: "Dự án phần mềm", faculty: "CNTT" },
  { code: "DBI201", name: "Cơ sở dữ liệu", faculty: "CNTT" },
  { code: "IOT102", name: "Internet of Things", faculty: "Điện - Điện tử" },
  { code: "MOB101", name: "Lập trình di động", faculty: "CNTT" },
  { code: "MAS202", name: "Khai phá dữ liệu", faculty: "CNTT" },
];

const BASE_CLASS_OPTIONS = [
  "SE1601",
  "SE1602",
  "SE1603",
  "JS22",
  "DBI201",
  "PRJ301",
  "IOT201",
  "IOT202",
  "CE301",
];

const AddLecturerModal = ({ open, onClose, lecturer, existingClasses, onSaved }: AddLecturerModalProps) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [passwordEditable, setPasswordEditable] = useState(false);
  const [status, setStatus] = useState<LecturerStatus>("Đang dạy");
  const [subjectCode, setSubjectCode] = useState(SUBJECT_OPTIONS[0]?.code || "");
  const [faculty, setFaculty] = useState(SUBJECT_OPTIONS[0]?.faculty || "CNTT");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectMap = useMemo(() => {
    const map = new Map<string, { name: string; faculty: string }>();
    SUBJECT_OPTIONS.forEach((opt) => map.set(opt.code, { name: opt.name, faculty: opt.faculty }));
    return map;
  }, []);

  const classOptions = useMemo(() => {
    const merged = new Set<string>([...BASE_CLASS_OPTIONS, ...(existingClasses || [])]);
    return Array.from(merged);
  }, [existingClasses]);

  const resetForm = useCallback(() => {
    setError(null);
    setSaving(false);
    setPasswordEditable(false);
    setPassword(DEFAULT_PASSWORD);

    if (lecturer) {
      setName(lecturer.name);
      setCode(lecturer.code);
      setEmail(lecturer.email || "");
      setPhone(lecturer.phone || "");
      setStatus(lecturer.status);
      const initialSubject = lecturer.dept || SUBJECT_OPTIONS[0]?.code || "";
      setSubjectCode(initialSubject);
      setFaculty(lecturer.faculty || subjectMap.get(initialSubject)?.faculty || "CNTT");
      setSelectedClasses(existingClasses || []);
    } else {
      setName("");
      setCode("");
      setEmail("");
      setPhone("");
      setStatus("Đang dạy");
      setSubjectCode(SUBJECT_OPTIONS[0]?.code || "");
      setFaculty(SUBJECT_OPTIONS[0]?.faculty || "CNTT");
      setSelectedClasses(existingClasses || []);
    }
  }, [existingClasses, lecturer, subjectMap]);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (!open) return;
    const subject = subjectMap.get(subjectCode);
    if (subject) {
      setFaculty(subject.faculty);
    }
  }, [open, subjectCode, subjectMap]);

  const handleToggleClass = (cls: string) => {
    setSelectedClasses((prev) => {
      const next = prev.includes(cls) ? prev.filter((item) => item !== cls) : [...prev, cls];
      return next;
    });
  };

  const subjectName = subjectMap.get(subjectCode)?.name || subjectCode;

  const summary = useMemo(() => {
    return {
      subjectName,
      status,
      classes: selectedClasses,
    };
  }, [selectedClasses, status, subjectName]);

  const handleSave = () => {
    if (saving) return;
    if (!name.trim()) {
      setError("Họ tên là bắt buộc");
      return;
    }
    const trimmedCode = code.trim();
    const generatedCode = trimmedCode || lecturer?.code || `GV${Date.now().toString().slice(-5)}`;
    const id = lecturer?.id || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `gv_${Date.now()}`);

    const nextLecturer: Lecturer = {
      id,
      name: name.trim(),
      code: generatedCode,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      dept: subjectCode,
      faculty,
      status,
      classes: selectedClasses.length,
    };

    setSaving(true);
    try {
      onSaved({ lecturer: nextLecturer, classes: selectedClasses });
    } finally {
      setSaving(false);
    }
  };

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
          <div className="title">{lecturer ? "Chỉnh sửa giảng viên" : "Thêm giảng viên"}</div>
          <button className="icon-btn" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body grid2">
          <div className="form-col primary">
            <div className="form-section">
              <div className="section-head">
                <div className="section-title">Thông tin cơ bản</div>
                <div className="section-subtitle">Các trường bắt buộc để tạo hồ sơ giảng viên</div>
              </div>
              <div className="field-stack">
                <label className="label">Họ tên</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" />
                <label className="label">Mã giảng viên</label>
                <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="GV001" />
                <label className="label">Email</label>
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@domain.com" />
                <label className="label">Số điện thoại</label>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="090x..." />
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
                <p className="hint-text">Bạn có thể thay đổi mật khẩu sau khi tạo tài khoản giảng viên.</p>
              </div>
            </div>
          </div>

          <div className="form-col secondary">
            <div className="form-section">
              <div className="section-head">
                <div className="section-title">Phân công giảng dạy</div>
                <div className="section-subtitle">Chọn mã môn và các lớp giảng viên phụ trách</div>
              </div>
              <div className="field-stack">
                <label className="label">Mã môn</label>
                <select className="input" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)}>
                  {SUBJECT_OPTIONS.map((subject) => (
                    <option key={subject.code} value={subject.code}>{subject.code} - {subject.name}</option>
                  ))}
                </select>
                <label className="label">Trạng thái</label>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value as LecturerStatus)}>
                  {LECTURER_STATUSES.map((stt) => (
                    <option key={stt} value={stt}>{stt}</option>
                  ))}
                </select>
                <label className="label">Chọn lớp</label>
                <div className="class-picker">
                  {classOptions.map((cls) => {
                    const active = selectedClasses.includes(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        className={`class-chip${active ? " active" : ""}`}
                        onClick={() => handleToggleClass(cls)}
                        title={active ? "Bỏ lớp" : "Chọn lớp"}
                      >
                        <span>{cls}</span>
                      </button>
                    );
                  })}
                </div>
                <label className="label">Lớp phụ trách</label>
                <div className="chips">
                  {selectedClasses.length > 0 ? selectedClasses.map((cls) => (
                    <span className="pill" key={cls}>{cls}</span>
                  )) : <span className="pill muted">Chưa chọn lớp</span>}
                </div>
              </div>
            </div>
            <div className="form-section soft">
              <div className="section-head">
                <div className="section-title">Tóm tắt nhanh</div>
                <div className="section-subtitle">Kiểm tra lại thông tin trước khi lưu</div>
              </div>
              <div className="summary-grid">
                <div className="summary-pill">📛 {name || "Chưa nhập tên"}</div>
                <div className="summary-pill">🆔 {code || "Chưa nhập mã"}</div>
                <div className="summary-pill">📚 Mã môn: {subjectName}</div>
                <div className="summary-pill">📌 Trạng thái: {summary.status}</div>
                <div className="summary-pill">🏫 {summary.classes.length} lớp phụ trách</div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="qr-btn" onClick={onClose}>Hủy</button>
          <button className="qr-btn" onClick={handleSave} disabled={saving}>💾 {saving ? "Đang lưu..." : "Lưu"}</button>
          {error && <span className="error-text" style={{ marginLeft: "1rem" }}>{error}</span>}
        </div>
      </div>
    </div>
  );
};

export default AddLecturerModal;
