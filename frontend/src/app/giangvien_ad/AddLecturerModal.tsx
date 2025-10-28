"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lecturer, LecturerStatus } from "./lecturerUtils";

type AddLecturerModalProps = {
  open: boolean;
  onClose: () => void;
  lecturer: Lecturer | null;
  existingClasses: string[];
  onSaved: (payload: { lecturer: Lecturer; classes: string[] }) => void;
};

const DEFAULT_PASSWORD = "giangvienfpt";

const AddLecturerModal = ({ open, onClose, lecturer, existingClasses, onSaved }: AddLecturerModalProps) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [passwordEditable, setPasswordEditable] = useState(false);
  const [status, setStatus] = useState<LecturerStatus>("Đang dạy");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } else {
      setName("");
      setCode("");
      setEmail("");
      setPhone("");
      setStatus("Đang dạy");
    }
  }, [lecturer]);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  const summary = useMemo(() => {
    return {
      code: code || "Chưa nhập",
      name: name || "Chưa nhập",
      email: email || "Chưa nhập",
      status,
    };
  }, [code, email, name, status]);

  const summaryItems = useMemo(
    () => [
      { icon: "🆔", label: "Mã GV", value: summary.code },
      { icon: "📛", label: "Họ tên", value: summary.name },
      { icon: "✉️", label: "Email", value: summary.email },
      { icon: "✅", label: "Trạng thái", value: summary.status },
    ],
    [summary]
  );

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
      dept: lecturer?.dept || "",
      faculty: lecturer?.faculty || "",
      status,
      classes: lecturer?.classes ?? existingClasses.length,
    };

    setSaving(true);
    try {
      onSaved({ lecturer: nextLecturer, classes: existingClasses });
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
            <div className="form-section soft">
              <div className="section-head">
                <div className="section-title">Tóm tắt nhanh</div>
                <div className="section-subtitle">Kiểm tra lại thông tin trước khi lưu</div>
              </div>
              <div className="summary-grid">
                {summaryItems.map((item) => (
                  <div className="summary-pill" key={item.label}>
                    <span className="summary-icon" aria-hidden>{item.icon}</span>
                    <div className="summary-text">
                      <span className="summary-label">{item.label}</span>
                      <span className="summary-value">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <div className="foot-left">
            {error && <span className="error-text">{error}</span>}
          </div>
          <div className="foot-right">
            <button className="qr-btn ghost" onClick={onClose}>Hủy</button>
            <button className="qr-btn" onClick={handleSave} disabled={saving}>
              {saving ? "⏳ Đang lưu..." : "💾 Lưu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddLecturerModal;
