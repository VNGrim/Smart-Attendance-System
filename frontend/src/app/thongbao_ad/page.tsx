"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  const [dark, setDark] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [drawer, setDrawer] = useState<Notice | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState<Notice | null>(null);
  const [list, setList] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setDark(!!s.themeDark);
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
        const response = await fetch("http://localhost:8080/api/admin/notifications", {
          credentials: "include",
        });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
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

  const dataView = useMemo(() => {
    if (filter === "all") return list;
    return list.filter((n) => n.category === filter || (filter === "scheduled" && n.status === "Lên lịch") || (filter === "deleted" && n.status === "Đã xóa"));
  }, [filter, list]);

  const openCreate = () => { setEdit(null); setModalOpen(true); };
  const openEdit = (n: Notice) => { setEdit(n); setModalOpen(true); };
  const softDelete = (id: string) => {
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, status: "Đã xóa", category: "deleted" } : n)));
  };

  const onSubmit = (payload: Partial<Notice> & { action: "send" | "schedule" }) => {
    if (edit) {
      setList((prev) => prev.map((n) => (n.id === edit.id ? { ...n, ...payload, title: payload.title || n.title, content: payload.content || n.content, target: payload.target || n.target, type: payload.type || n.type, status: payload.action === "send" ? "Đã gửi" : "Lên lịch", sendTime: payload.action === "send" ? new Date().toLocaleString("vi-VN") : n.sendTime, scheduledAt: payload.action === "schedule" ? (payload.scheduledAt as string) : null } as Notice : n)));
    } else {
      const id = Math.random().toString(36).slice(2, 9);
      const category = (payload.category as NoticeCategory) || inferCategoryFromTarget(payload.target || "");
      const sendTime = payload.action === "send" ? formatDateTime(new Date()) : "--";
      setList((prev) => prev.concat({ id, title: payload.title || "", sender: "Admin", target: payload.target || "Toàn trường", category, type: payload.type || "Khác", sendTime, status: payload.action === "send" ? "Đã gửi" : "Lên lịch", content: payload.content || "", recipients: (payload.recipients as string[] | undefined) ?? undefined, scheduledAt: payload.action === "schedule" ? (payload.scheduledAt as string) : null }));
    }
    setModalOpen(false);
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
          <button className="icon-btn" onClick={toggleDark} title="Chuyển giao diện">{dark ? "🌙" : "🌞"}</button>
          <button className="icon-btn notif" title="Thông báo">🔔{notifCount>0 && <span className="badge">{notifCount}</span>}</button>
          <div className="avatar-menu">
            <div className="avatar">🧑‍💼</div>
            <div className="dropdown">
              <a href="#" onClick={(e)=>e.preventDefault()}>Hồ sơ</a>
              <a href="#" onClick={(e)=>{e.preventDefault(); if(confirm("Đăng xuất?")){ localStorage.removeItem("sas_user"); router.push("/login"); }}}>Đăng xuất</a>
            </div>
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

  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formTarget, setFormTarget] = useState("Tất cả sinh viên");
  const [formType, setFormType] = useState("Học vụ");
  const [formScheduleMode, setFormScheduleMode] = useState<"now" | "schedule">("now");
  const [formDateTime, setFormDateTime] = useState("");
  const [formAllowReply, setFormAllowReply] = useState(true);
  const [formShowBanner, setFormShowBanner] = useState(false);

  useEffect(() => {
    if (edit) {
      setFormTitle(edit.title);
      setFormContent(edit.content);
      setFormTarget(edit.target);
      setFormType(edit.type);
      setFormScheduleMode(edit.status === "Lên lịch" ? "schedule" : "now");
      setFormDateTime(edit.scheduledAt || "");
      setFormAllowReply(true);
      setFormShowBanner(false);
    } else {
      setFormTitle("");
      setFormContent("");
      setFormTarget("Tất cả sinh viên");
      setFormType("Học vụ");
      setFormScheduleMode("now");
      setFormDateTime("");
      setFormAllowReply(true);
      setFormShowBanner(false);
    }
  }, [modalOpen, edit]);

  const Toolbar = () => {
    const apply = (cmd: "bold" | "insertUnorderedList" | "createLink") => {
      if (cmd === "createLink") {
        const url = prompt("Nhập URL:") || "";
        if (!url) return;
        document.execCommand(cmd, false, url);
      } else {
        document.execCommand(cmd);
      }
    };
    return (
      <div className="toolbar">
        <button type="button" onClick={() => apply("bold")}>B</button>
        <button type="button" onClick={() => apply("insertUnorderedList")}>•</button>
        <button type="button" onClick={() => apply("createLink")}>🔗</button>
      </div>
    );
  };

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
              <div className="trow" key={n.id} onMouseEnter={() => setDrawer(n)} onClick={() => setDrawer(n)}>
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
        <div className="drawer" onClick={() => setDrawer(null)}>
          <div className="drawer-panel" onClick={(e)=>e.stopPropagation()}>
            <div className="drawer-head">
              <div className="title">{drawer.title}</div>
              <button className="icon-btn" onClick={() => setDrawer(null)}>✖</button>
            </div>
            <div className="drawer-body">
              <div className="kv"><span className="k">Nội dung</span><span className="v">{drawer.content}</span></div>
              <div className="kv"><span className="k">Đối tượng</span><span className="v">{drawer.target}</span></div>
              <div className="kv"><span className="k">Trạng thái</span><span className="v">{drawer.status} {drawer.scheduledAt?`(Lịch: ${drawer.scheduledAt})`:""}</span></div>
              {drawer.recipients && <div className="kv"><span className="k">Người nhận</span><span className="v">{drawer.recipients.join(", ")}</span></div>}
              {drawer.history && <div className="kv"><span className="k">Lịch sử</span><span className="v">{drawer.history.join(" • ")}</span></div>}
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal" onClick={() => setModalOpen(false)}>
          <div className="modal-content wide" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="title">{edit?"Chỉnh sửa thông báo":"Tạo thông báo mới"}</div>
              <button className="icon-btn" onClick={() => setModalOpen(false)}>✖</button>
            </div>
            <div className="modal-body grid2">
              <div className="form-col">
                <label className="label">Tiêu đề</label>
                <input value={formTitle} onChange={(e)=>setFormTitle(e.target.value)} className="input" placeholder="Nhập tiêu đề" />
                <label className="label">Nội dung</label>
                <Toolbar />
                <div className="editor" contentEditable suppressContentEditableWarning onInput={(e:any)=>setFormContent(e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{__html: formContent}} />
              </div>
              <div className="form-col">
                <label className="label">Đối tượng nhận</label>
                <select className="input" value={formTarget} onChange={(e)=>setFormTarget(e.target.value)}>
                  <option>Tất cả sinh viên</option>
                  <option>Một hoặc nhiều lớp học</option>
                  <option>Giảng viên cụ thể</option>
                  <option>Gửi theo điều kiện</option>
                </select>
                <label className="label">Loại thông báo</label>
                <select className="input" value={formType} onChange={(e)=>setFormType(e.target.value)}>
                  <option>Học vụ</option>
                  <option>Nội bộ</option>
                  <option>Hệ thống</option>
                  <option>Khác</option>
                </select>
                <label className="label">Thời gian gửi</label>
                <div className="radio-row">
                  <label><input type="radio" name="sched" checked={formScheduleMode==="now"} onChange={()=>setFormScheduleMode("now")} /> Ngay lập tức</label>
                  <label><input type="radio" name="sched" checked={formScheduleMode==="schedule"} onChange={()=>setFormScheduleMode("schedule")} /> Lên lịch</label>
                </div>
                {formScheduleMode === "schedule" && (
                  <input className="input" type="datetime-local" value={formDateTime} onChange={(e)=>setFormDateTime(e.target.value)} />
                )}
                <label className="label">Tùy chọn hiển thị</label>
                <div className="check-row">
                  <label><input type="checkbox" checked={formAllowReply} onChange={(e)=>setFormAllowReply(e.target.checked)} /> Cho phép phản hồi</label>
                  <label><input type="checkbox" checked={formShowBanner} onChange={(e)=>setFormShowBanner(e.target.checked)} /> Hiển thị banner trên dashboard</label>
                </div>
              </div>
            </div>
            <div className="modal-foot space">
              <button className="qr-btn" onClick={()=>setModalOpen(false)}>Hủy</button>
              <div className="actions-row">
                <button className="qr-btn" onClick={()=>onSubmit({ title: formTitle, content: formContent, target: formTarget, type: formType, category: formTarget.includes("Giảng viên")?"giangvien":formTarget.includes("sinh viên")?"sinhvien":"toantruong", action: "send" })}>💾 Lưu & Gửi ngay</button>
                <button className="qr-btn" onClick={()=>onSubmit({ title: formTitle, content: formContent, target: formTarget, type: formType, category: formTarget.includes("Giảng viên")?"giangvien":formTarget.includes("sinh viên")?"sinhvien":"toantruong", action: "schedule", scheduledAt: formDateTime })}>🕓 Lưu & Lên lịch</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

