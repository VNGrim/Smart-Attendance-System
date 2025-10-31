"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { apiFetch, apiFetchJson } from "../../lib/authClient";
import { useRouter } from "next/navigation";

type NoticeCategory = "toantruong" | "giangvien" | "sinhvien" | "scheduled" | "deleted" | "khac";

type Notice = {
  id: string;
  title: string;
  sender: string;
  target: string;
  category: NoticeCategory;
  type: string;
  sendTime: string;
  status: string;
  content: string;
  recipients?: string[];
  history?: string[];
  scheduledAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type Lecturer = {
  teacherId: string;
  fullName: string;
  subject: string | null;
  classes: string | null;
};

type NoticeFormPayload = {
  title: string;
  content: string;
  target: string;
  type: string;
  action: "draft" | "send";
  allowReply: boolean;
  showBanner: boolean;
  recipients: string[];
};

const TARGET_OPTIONS = ["Tất cả sinh viên", "Tất cả giảng viên", "Giảng viên cụ thể"];

type AnnouncementModalProps = {
  open: boolean;
  edit: Notice | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: NoticeFormPayload) => void;
};

function AnnouncementModal({ open, edit, saving, onClose, onSubmit }: AnnouncementModalProps) {
  const isEdit = Boolean(edit);
  const TITLE_LIMIT = 120;
  const CONTENT_LIMIT = 2000;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [target, setTarget] = useState("Tất cả sinh viên");
  const [noticeType, setNoticeType] = useState("Học vụ");
  const [allowReply, setAllowReply] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [selectedLecturers, setSelectedLecturers] = useState<string[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [lecturerLoading, setLecturerLoading] = useState(false);
  const [lecturerError, setLecturerError] = useState<string | null>(null);
  const [lecturerSearch, setLecturerSearch] = useState("");

  const fetchLecturers = useCallback(async (options: { search?: string; ids?: string[] } = {}) => {
    const rawSearch = typeof options.search === "string" ? options.search : "";
    const trimmedSearch = rawSearch.trim();
    const ids = Array.isArray(options.ids) ? options.ids.filter((item) => item && item.trim().length) : undefined;
    setLecturerLoading(true);
    setLecturerError(null);
    try {
      const res = await apiFetch(`/api/admin/notifications/lecturers`, {
        method: "GET",
        params: {
          search: trimmedSearch,
          ids: ids?.join(","),
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const list: Lecturer[] = Array.isArray(data?.lecturers)
        ? data.lecturers
            .map((item: Record<string, unknown>) => ({
              teacherId: String(item?.teacherId ?? ""),
              fullName: String(item?.fullName ?? ""),
              subject: item?.subject ? String(item.subject) : null,
              classes: item?.classes ? String(item.classes) : null,
            }))
            .filter((item: Lecturer) => Boolean(item.teacherId))
        : [];
      setLecturers(list);
    } catch (err) {
      console.error("fetch lecturers error", err);
      setLecturerError("Không tải được danh sách giảng viên");
    } finally {
      setLecturerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const rawTarget = edit?.target ?? "Tất cả sinh viên";
    const normalizedTarget = TARGET_OPTIONS.includes(rawTarget) ? rawTarget : "Tất cả sinh viên";
    setTitle(edit?.title ?? "");
    setContent(edit?.content ?? "");
    setTarget(normalizedTarget);
    setNoticeType(edit?.type ?? "Học vụ");
    setAllowReply(true);
    setShowBanner(false);
    const initialSelected =
      normalizedTarget === "Giảng viên cụ thể" && Array.isArray(edit?.recipients)
        ? edit.recipients.map((item) => String(item))
        : [];
    setSelectedLecturers(initialSelected);
    setLecturerSearch("");
    setLecturers([]);
    setLecturerError(null);
    if (normalizedTarget === "Giảng viên cụ thể") {
      fetchLecturers(initialSelected.length ? { ids: initialSelected } : {});
    }
  }, [open, edit, fetchLecturers]);

  const handleTargetChange = (value: string) => {
    const nextValue = TARGET_OPTIONS.includes(value) ? value : "Tất cả sinh viên";
    setTarget(nextValue);
    if (nextValue === "Giảng viên cụ thể") {
      setLecturerSearch("");
      setLecturerError(null);
      fetchLecturers();
    } else {
      setSelectedLecturers([]);
      setLecturers([]);
      setLecturerError(null);
    }
  };

  const toggleLecturerSelection = (id: string, checked: boolean) => {
    setSelectedLecturers((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  };

  const handleLecturerSearch = () => {
    fetchLecturers(lecturerSearch.trim() ? { search: lecturerSearch } : {});
  };

  if (!open) return null;

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  const titleCount = title.length;
  const contentCount = content.length;

  const recipientsValid = target !== "Giảng viên cụ thể" || selectedLecturers.length > 0;
  const canSend = !saving && trimmedTitle.length > 0 && trimmedContent.length > 0 && recipientsValid;

  const submit = (action: "draft" | "send") => {
    onSubmit({
      title: trimmedTitle,
      content: trimmedContent,
      target: target.trim() || "Toàn trường",
      type: noticeType.trim() || "Khác",
      action,
      allowReply,
      showBanner,
      recipients: target === "Giảng viên cụ thể" ? selectedLecturers : [],
    });
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="title">{isEdit ? "Chỉnh sửa thông báo" : "Tạo thông báo mới"}</div>
          <button className="icon-btn" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body grid2">
          <div className="form-col primary">
            <div className="form-section">
              <div className="section-head">
                <div className="section-title">Thông tin chính</div>
                <div className="section-subtitle">Nhập tiêu đề và nội dung cho thông báo</div>
              </div>
              <div className="field-stack">
                <div className="field-label-row">
                  <label className="label" htmlFor="notice-title">Tiêu đề</label>
                  <span className="field-hint">{titleCount}/{TITLE_LIMIT}</span>
                </div>
                <input
                  id="notice-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                  placeholder="Ví dụ: Thông báo lịch thi cuối kỳ"
                  maxLength={TITLE_LIMIT}
                  autoFocus
                />
                <div className="field-label-row">
                  <label className="label" htmlFor="notice-content">Nội dung</label>
                  <span className="field-hint">{contentCount}/{CONTENT_LIMIT}</span>
                </div>
                <textarea
                  id="notice-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="input textarea"
                  placeholder="Soạn nội dung chi tiết, sử dụng xuống dòng để tách ý..."
                  rows={10}
                  maxLength={CONTENT_LIMIT}
                />
              </div>
            </div>
            <div className="form-section">
              <div className="section-head">
                <div className="section-title">Tùy chọn hiển thị</div>
                <div className="section-subtitle">Thiết lập quyền phản hồi và nổi bật</div>
              </div>
              <div className="checkbox-stack">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={allowReply}
                    onChange={(e) => setAllowReply(e.target.checked)}
                  />
                  <span>Cho phép người nhận phản hồi</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={showBanner}
                    onChange={(e) => setShowBanner(e.target.checked)}
                  />
                  <span>Hiển thị banner nổi bật trên dashboard</span>
                </label>
              </div>
            </div>
          </div>
          <div className="form-col secondary">
            <div className="form-section">
              <div className="section-head">
                <div className="section-title">Đối tượng & phân loại</div>
                <div className="section-subtitle">Chọn nhóm nhận và loại thông báo</div>
              </div>
              <div className="field-stack">
                <label className="label" htmlFor="notice-target">Đối tượng nhận</label>
                <select id="notice-target" className="input" value={target} onChange={(e) => handleTargetChange(e.target.value)}>
                  <option>Tất cả sinh viên</option>
                  <option>Tất cả giảng viên</option>
                  <option>Giảng viên cụ thể</option>
                </select>
                {target === "Giảng viên cụ thể" && (
                  <div className="lecturer-selector">
                    <div className="search-row">
                      <input
                        className="input"
                        placeholder="Tìm theo mã hoặc tên giảng viên"
                        value={lecturerSearch}
                        onChange={(e) => setLecturerSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleLecturerSearch();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="qr-btn"
                        onClick={handleLecturerSearch}
                        disabled={lecturerLoading}
                      >
                        🔍 {lecturerLoading ? "Đang tìm..." : "Tìm"}
                      </button>
                      <button
                        type="button"
                        className="qr-btn"
                        onClick={() => {
                          setLecturerSearch("");
                          fetchLecturers();
                        }}
                        disabled={lecturerLoading}
                      >
                        🔄 Làm mới
                      </button>
                    </div>
                    <div className="table mini-table">
                      <div className="thead">
                        <div>Chọn</div>
                        <div>Mã GV</div>
                        <div>Họ tên</div>
                        <div>Môn</div>
                        <div>Lớp</div>
                      </div>
                      <div className="tbody">
                        {lecturerLoading && <div className="trow message">Đang tải danh sách giảng viên...</div>}
                        {lecturerError && !lecturerLoading && <div className="trow error">{lecturerError}</div>}
                        {!lecturerLoading && !lecturerError && lecturers.length === 0 && (
                          <div className="trow message">Không có giảng viên phù hợp với tìm kiếm</div>
                        )}
                        {!lecturerLoading && !lecturerError && lecturers.map((lec) => {
                          const checked = selectedLecturers.includes(lec.teacherId);
                          const rowClass = `trow${checked ? " selected" : ""}`;
                          const toggle = () => toggleLecturerSelection(lec.teacherId, !checked);
                          return (
                            <div
                              className={rowClass}
                              key={lec.teacherId}
                              onClick={toggle}
                              onKeyDown={(e) => {
                                if (e.key === " " || e.key === "Enter") {
                                  e.preventDefault();
                                  toggle();
                                }
                              }}
                              tabIndex={0}
                              role="button"
                              aria-pressed={checked}
                            >
                              <div>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => toggleLecturerSelection(lec.teacherId, e.target.checked)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div>{lec.teacherId}</div>
                              <div>{lec.fullName}</div>
                              <div>{lec.subject ?? "--"}</div>
                              <div>{lec.classes ?? "--"}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="field-hint">
                      <span className="selected-count-tag">
                        ✅ Đã chọn {selectedLecturers.length} giảng viên
                      </span>
                      {selectedLecturers.length === 0 && <span> · Vui lòng chọn ít nhất 1 giảng viên</span>}
                    </div>
                    {selectedLecturers.length > 0 && (
                      <div className="actions-row">
                        <button type="button" className="icon-btn" onClick={() => setSelectedLecturers([])}>
                          ✖ Bỏ chọn hết
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <label className="label" htmlFor="notice-type">Loại thông báo</label>
                <select id="notice-type" className="input" value={noticeType} onChange={(e) => setNoticeType(e.target.value)}>
                  <option>Học vụ</option>
                  <option>Nội bộ</option>
                  <option>Hệ thống</option>
                  <option>Khác</option>
                </select>
              </div>
            </div>
            <div className="form-section">
              <div className="section-head">
                <div className="section-title">Tác vụ gửi</div>
                <div className="section-subtitle">Quyết định lưu nháp hoặc gửi ngay thông báo</div>
              </div>
              <div className="info-card">
                <div className="info-item">
                  <strong>💾 Lưu nháp:</strong> Lưu lại bản soạn thảo, chưa gửi tới người nhận. Có thể chỉnh sửa và gửi sau.
                </div>
                <div className="info-item">
                  <strong>✈️ Gửi ngay:</strong> Phát hành liền lập tức đến đối tượng đã chọn. Hệ thống sẽ ghi thời gian gửi hiện tại.
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-foot space">
          <button className="qr-btn" onClick={onClose}>Hủy</button>
          <div className="actions-row">
            <button className="qr-btn" disabled={!canSend} onClick={() => submit("draft")}>
              {saving ? "Đang lưu..." : "💾 Lưu nháp"}
            </button>
            <button className="qr-btn" disabled={!canSend} onClick={() => submit("send")}>
              ✈️ {saving ? "Đang lưu..." : "Gửi ngay"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(input: unknown): string {
  if (!input) return "--";
  const value = input instanceof Date ? input : new Date(String(input));
  if (Number.isNaN(value.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function toArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean);
    } catch {}
    return value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [String(value)];
}

function normalizeCategory(category?: unknown, target?: unknown, status?: unknown): NoticeCategory {
  const statusLower = String(status ?? "").toLowerCase();
  if (statusLower.includes("xóa")) return "deleted";
  if (statusLower.includes("schedule") || statusLower.includes("lịch")) return "scheduled";

  const cat = String(category ?? "").toLowerCase();
  const tgt = String(target ?? "").toLowerCase();
  if (cat.includes("giảng") || tgt.includes("giảng")) return "giangvien";
  if (cat.includes("sinh") || tgt.includes("sinh")) return "sinhvien";
  if (cat.includes("toàn") || tgt.includes("toàn") || tgt.includes("all")) return "toantruong";
  return "khac";
}

function inferCategoryFromTarget(target?: string | null): NoticeCategory {
  const tgt = (target ?? "").toLowerCase();
  if (tgt.includes("giảng")) return "giangvien";
  if (tgt.includes("sinh")) return "sinhvien";
  return "toantruong";
}

function mapServerNotice(raw: any): Notice {
  const id = typeof raw?.id === "string" && raw.id
    ? raw.id
    : raw?.code
      ? String(raw.code)
      : raw?.dbId
        ? `ANN-${raw.dbId}`
        : Math.random().toString(36).slice(2, 10);

  const sendSource = raw?.sendTime ?? raw?.send_time ?? raw?.createdAt ?? raw?.created_at;
  const scheduledSource = raw?.scheduledAt ?? raw?.scheduled_at;
  const createdSource = raw?.createdAt ?? raw?.created_at;
  const updatedSource = raw?.updatedAt ?? raw?.updated_at;

  const notice: Notice = {
    id,
    title: String(raw?.title ?? ""),
    sender: String(raw?.sender ?? "Admin"),
    target: String(raw?.target ?? "Toàn trường"),
    category: normalizeCategory(raw?.category, raw?.target, raw?.status),
    type: String(raw?.type ?? "Khác"),
    sendTime: formatDateTime(sendSource),
    status: String(raw?.status ?? "Đã gửi"),
    content: String(raw?.content ?? ""),
    recipients: toArray(raw?.recipients),
    history: toArray(raw?.history),
    scheduledAt: scheduledSource ? formatDateTime(scheduledSource) : null,
    createdAt: createdSource ? formatDateTime(createdSource) : null,
    updatedAt: updatedSource ? formatDateTime(updatedSource) : null,
  };

  if (!notice.recipients?.length) delete notice.recipients;
  if (!notice.history?.length) delete notice.history;
  if (!notice.createdAt) delete notice.createdAt;
  if (!notice.updatedAt) delete notice.updatedAt;

  return notice;
}

export default function AdminNotifyPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [drawer, setDrawer] = useState<Notice | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState<Notice | null>(null);
  const [list, setList] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const letterParagraphs = useMemo(() => {
    if (!drawer?.content) return [] as string[];
    return drawer.content
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);
  }, [drawer]);

  const filters = [
    { key: "all", label: "Tất cả" },
    { key: "toantruong", label: "📢 Toàn trường" },
    { key: "giangvien", label: "👨‍🏫 Giảng viên" },
    { key: "sinhvien", label: "🎓 Sinh viên" },
    { key: "scheduled", label: "⏰ Đã lên lịch" },
    { key: "deleted", label: "🗑 Đã xóa" },
  ];

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sas_settings");
      if (saved) {
        const s = JSON.parse(saved);
        document.documentElement.style.colorScheme = s.themeDark ? "dark" : "light";
      }
    } catch {}
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadAnnouncements = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetchJson("/api/admin/notifications");
        const rawList = Array.isArray(data?.announcements) ? data.announcements : [];
        const mapped: Notice[] = rawList.map(mapServerNotice);
        if (!ignore) {
          setList(mapped);
          setDrawer(null);
          setEdit(null);
          const pendingCount = mapped.filter((item: Notice) => {
            const status = item.status.toLowerCase();
            return status.includes("lên lịch") || status.includes("đang gửi") || status.includes("pending");
          }).length;
          setNotifCount(pendingCount);
        }
      } catch (err: any) {
        if (!ignore) {
          console.error("admin notifications fetch error", err);
          setError("Không tải được danh sách thông báo");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadAnnouncements();

    return () => {
      ignore = true;
    };
  }, []);

  const reloadList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetchJson("/api/admin/notifications");
      const rawList = Array.isArray(data?.announcements) ? data.announcements : [];
      const mapped: Notice[] = rawList.map(mapServerNotice);
      setList(mapped);
      const pendingCount = mapped.filter((item: Notice) => {
        const status = item.status.toLowerCase();
        return status.includes("lên lịch") || status.includes("đang gửi") || status.includes("pending");
      }).length;
      setNotifCount(pendingCount);
    } catch (err) {
      console.error("admin notifications reload error", err);
      setError("Không tải được danh sách thông báo");
    } finally {
      setLoading(false);
    }
  };

  const dataView = useMemo(() => {
    if (filter === "all") return list;
    return list.filter((n) => n.category === filter || (filter === "scheduled" && n.status === "Lên lịch") || (filter === "deleted" && n.status === "Đã xóa"));
  }, [filter, list]);

  const openCreate = () => {
    setEdit(null);
    setModalOpen(true);
  };

  const openEdit = (n: Notice) => {
    setEdit(n);
    setModalOpen(true);
  };
  const softDelete = (id: string) => {
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, status: "Đã xóa", category: "deleted" } : n)));
  };

  const closeModal = () => {
    setModalOpen(false);
    setEdit(null);
  };

  const handleModalSubmit = (payload: NoticeFormPayload) => {
    const category = inferCategoryFromTarget(payload.target);
    const status = payload.action === "send" ? "Đã gửi" : "Nháp";
    const recipients = payload.target === "Giảng viên cụ thể" ? payload.recipients : undefined;

    if (edit) {
      setList((prev) =>
        prev.map((n) =>
          n.id === edit.id
            ? {
                ...n,
                title: payload.title,
                content: payload.content,
                target: payload.target,
                type: payload.type,
                category,
                status,
                sendTime: payload.action === "send" ? formatDateTime(new Date()) : n.sendTime,
                scheduledAt: null,
                recipients,
              }
            : n,
        ),
      );
      closeModal();
      return;
    }

    const sendAt = payload.action === "send" ? new Date() : undefined;

    const body = {
      title: payload.title,
      content: payload.content,
      target: payload.target,
      type: payload.type,
      category,
      status,
      sendTime: sendAt?.toISOString(),
      scheduledAt: undefined,
      sender: "Admin",
      recipients,
    };

    setSaving(true);
    apiFetchJson("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(() => reloadList())
      .then(() => closeModal())
      .catch((err) => {
        console.error("create announcement error", err);
        alert("Tạo thông báo thất bại. " + (err.message || ""));
      })
      .finally(() => setSaving(false));
  };

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
          <Link href="/thongbao_ad" className="side-link active" title="Thông báo">📢 {!collapsed && "Thông báo"}</Link>
          <Link href="/sinhvien_ad" className="side-link" title="Sinh viên">👨‍🎓 {!collapsed && "Sinh viên"}</Link>
          <Link href="/giangvien_ad" className="side-link" title="Giảng viên">👩‍🏫 {!collapsed && "Giảng viên"}</Link>
          <Link href="/lophoc_ad" className="side-link" title="Lớp học">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/lichhoc_ad" className="side-link" title="Lịch học">📅 {!collapsed && "Lịch học"}</Link>
          <Link href="/taikhoan_ad" className="side-link" title="Tài khoản">🔑 {!collapsed && "Tài khoản"}</Link>
          <Link href="/caidat_ad" className="side-link" title="Cấu hình">⚙️ {!collapsed && "Cấu hình"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="top-left">
          <div className="page-title">📢 Thông báo</div>
        </div>
        <div className="controls">
          <div className="filter-group">
            {filters.map((f) => (
              <button key={f.key} className={`chip ${filter===f.key?"active":""}`} onClick={() => setFilter(f.key)}>{f.label}</button>
            ))}
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
      <div className="panel">
        <div className="panel-head-row">
          <div className="panel-title">Danh sách thông báo</div>
          <div className="panel-actions">
            <button className="qr-btn" onClick={openCreate}>+ Tạo thông báo mới</button>
          </div>
        </div>
        <div className="table notice-table">
          <div className="thead">
            <div>Tiêu đề</div>
            <div>Người gửi</div>
            <div>Đối tượng nhận</div>
            <div>Loại</div>
            <div>Thời gian gửi</div>
            <div>Trạng thái</div>
            <div>Thao tác</div>
          </div>
          <div className="tbody">
            {loading && <div className="trow">Đang tải dữ liệu...</div>}
            {error && !loading && <div className="trow error">{error}</div>}
            {!loading && !error && dataView.length === 0 && <div className="trow">Không có thông báo</div>}
            {!loading && !error && dataView.map((n) => (
              <div className="trow" key={n.id} onClick={() => setDrawer(n)}>
                <div className="ttitle" title={n.content}>{n.title}</div>
                <div>{n.sender}</div>
                <div>{n.target}</div>
                <div>{n.type}</div>
                <div>{n.sendTime}</div>
                <div>
                  <span className={`status ${n.status}`.replace(/\s/g,"-")}>{n.status}</span>
                </div>
                <div className="actions">
                  <button className="icon-btn" title="Chỉnh sửa" onClick={(e)=>{e.stopPropagation(); openEdit(n);}}>✏️</button>
                  {!n.status.toLowerCase().includes("xóa") && <button className="icon-btn" title="Xóa" onClick={(e)=>{e.stopPropagation(); if(confirm("Xóa thông báo?")) softDelete(n.id);}}>🗑</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {drawer && (
        <div className="modal letter-modal" onClick={() => setDrawer(null)}>
          <div className="modal-content letter-card" onClick={(e)=>e.stopPropagation()}>
            <div className="letter-card-head">
              <div className="letter-card-meta">
                <span className="letter-chip">THÔNG BÁO</span>
                <h2 className="letter-title">{drawer.title}</h2>
              </div>
              <button className="icon-btn" onClick={() => setDrawer(null)}>✖</button>
            </div>
            <div className="letter-card-body">
              <div className="letter-info-grid">
                <div>
                  <div className="letter-label">Người gửi</div>
                  <div className="letter-value">{drawer.sender}</div>
                </div>
                <div>
                  <div className="letter-label">Ngày giờ gửi</div>
                  <div className="letter-value">{drawer.sendTime || "--"}</div>
                </div>
                <div>
                  <div className="letter-label">Gửi tới</div>
                  <div className="letter-value">{drawer.target || "Quý người nhận"}</div>
                </div>
                {drawer.recipients && drawer.recipients.length > 0 && (
                  <div>
                    <div className="letter-label">Danh sách nhận</div>
                    <div className="letter-value recipients">{drawer.recipients.join(", ")}</div>
                  </div>
                )}
              </div>
              <div className="letter-divider" />
              <div className="letter-message">
                <p className="letter-greeting">Kính gửi {(drawer.target || "Quý người nhận").toLowerCase()},</p>
                {letterParagraphs.length > 0 ? (
                  letterParagraphs.map((paragraph, idx) => (
                    <p key={idx} className="letter-paragraph">{paragraph}</p>
                  ))
                ) : (
                  <p className="letter-paragraph">(Không có nội dung)</p>
                )}
                <div className="letter-signature">Trân trọng,<br />{drawer.sender}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      <AnnouncementModal
        open={modalOpen}
        edit={edit}
        saving={saving}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
      />
    </Shell>
  );
}
