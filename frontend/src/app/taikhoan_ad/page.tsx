"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetchJson } from "../../lib/authClient";

type Role = "Admin" | "Giảng viên" | "Sinh viên";
type RoleKey = "admin" | "teacher" | "student";
type Status = "Hoạt động" | "Bị khóa" | "Chờ kích hoạt";
type StatusKey = "active" | "locked" | "pending";

type Account = {
  id: string;
  avatar: string;
  name: string;
  code: string;
  email: string;
  role: Role;
  roleKey: RoleKey;
  status: Status;
  statusKey: StatusKey;
  lastLogin: string;
  lastLoginRaw?: string | null;
  createdAt?: string | null;
};

type ApiAccount = {
  id: number;
  userCode: string;
  role: RoleKey;
  roleLabel: string;
  avatar: string;
  fullName: string | null;
  email: string | null;
  status: StatusKey;
  statusLabel: string;
  rawStatus: string | null;
  createdAt: string | null;
  lastLogin: string | null;
};

type AccountsResponse = {
  success: boolean;
  accounts: ApiAccount[];
  summary?: {
    total: number;
    byRole?: Record<string, number>;
    byStatus?: Record<string, number>;
  };
  message?: string;
};

type AccountsSummary = {
  total: number;
  byRole: Record<RoleKey, number>;
  byStatus: Record<StatusKey, number>;
};

type SasSettings = { themeDark?: boolean };
type SettingsEventDetail = { themeDark: boolean };

const SETTINGS_CHANGED_EVENT = "sas_settings_changed";

const ROLE_LABEL_MAP: Record<RoleKey, Role> = {
  admin: "Admin",
  teacher: "Giảng viên",
  student: "Sinh viên",
};

const STATUS_LABEL_MAP: Record<StatusKey, Status> = {
  active: "Hoạt động",
  locked: "Bị khóa",
  pending: "Chờ kích hoạt",
};

const AVATAR_MAP: Record<RoleKey, string> = {
  admin: "👤",
  teacher: "🧑‍🏫",
  student: "🎓",
};

const ROLE_FILTER_LABEL_TO_KEY: Record<string, RoleKey | null> = {
  "Tất cả vai trò": null,
  Admin: "admin",
  "Giảng viên": "teacher",
  "Sinh viên": "student",
};

const roleLabelToKey = (label: Role): RoleKey => {
  switch (label) {
    case "Admin":
      return "admin";
    case "Giảng viên":
      return "teacher";
    default:
      return "student";
  }
};

const statusLabelToKey = (label: Status): StatusKey => {
  switch (label) {
    case "Bị khóa":
      return "locked";
    case "Chờ kích hoạt":
      return "pending";
    default:
      return "active";
  }
};

const formatDateTime = (input?: string | null) => {
  if (!input) return "--";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const mapApiAccount = (item: ApiAccount): Account => {
  const roleKey = item.role ?? "admin";
  const statusKey = item.status ?? "active";
  const name = item.fullName?.trim() || item.userCode;
  return {
    id: String(item.userCode || item.id),
    avatar: item.avatar || AVATAR_MAP[roleKey] || "👥",
    name,
    code: item.userCode,
    email: item.email?.trim() ?? "",
    role: ROLE_LABEL_MAP[roleKey] ?? "Admin",
    roleKey,
    status: STATUS_LABEL_MAP[statusKey] ?? "Hoạt động",
    statusKey,
    lastLogin: formatDateTime(item.lastLogin),
    lastLoginRaw: item.lastLogin,
    createdAt: item.createdAt,
  };
};

const emptySummary = (): AccountsSummary => ({
  total: 0,
  byRole: { admin: 0, teacher: 0, student: 0 },
  byStatus: { active: 0, locked: 0, pending: 0 },
});

const normalizeSummary = (raw?: AccountsResponse["summary"]): AccountsSummary | null => {
  if (!raw) return null;
  return {
    total: Number(raw.total ?? 0),
    byRole: {
      admin: Number(raw.byRole?.admin ?? 0),
      teacher: Number(raw.byRole?.teacher ?? 0),
      student: Number(raw.byRole?.student ?? 0),
    },
    byStatus: {
      active: Number(raw.byStatus?.active ?? 0),
      locked: Number(raw.byStatus?.locked ?? 0),
      pending: Number(raw.byStatus?.pending ?? 0),
    },
  };
};

const computeSummaryFromAccounts = (accounts: Account[]): AccountsSummary => {
  return accounts.reduce<AccountsSummary>((acc, item) => {
    acc.total += 1;
    acc.byRole[item.roleKey] += 1;
    acc.byStatus[item.statusKey] += 1;
    return acc;
  }, emptySummary());
};

export default function AdminAccountsPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount] = useState(2);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("Tất cả vai trò");

  const [list, setList] = useState<Account[]>([]);
  const [summary, setSummary] = useState<AccountsSummary>(emptySummary());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof Account>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState<null | Account>(null);
  const [edit, setEdit] = useState<Account | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const updateList = useCallback((updater: (prev: Account[]) => Account[]) => {
    setList((prev) => {
      const next = updater(prev);
      setSummary(computeSummaryFromAccounts(next));
      return next;
    });
  }, [setSummary]);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetchJson<AccountsResponse>("/api/admin/accounts");
      const accounts = Array.isArray(data.accounts) ? data.accounts.map(mapApiAccount) : [];
      setList(accounts);
      const nextSummary = normalizeSummary(data.summary) ?? computeSummaryFromAccounts(accounts);
      setSummary(nextSummary);
      setSelected(new Set());
      setPage(1);
    } catch (err) {
      console.error("admin accounts fetch error", err);
      const message = err instanceof Error && err.message ? err.message : "Không tải được danh sách tài khoản";
      setError(message);
      if (message.toLowerCase().includes("unauthorized")) {
        router.push("/login");
      }
      setList([]);
      setSummary(emptySummary());
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sas_settings");
      if (saved) {
        const settings: SasSettings = JSON.parse(saved);
        const themeDark = settings.themeDark ?? false;
        setDark(themeDark);
        document.documentElement.style.colorScheme = themeDark ? "dark" : "light";
      }
    } catch {}

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SettingsEventDetail>).detail;
      if (!detail) return;
      setDark(detail.themeDark);
      document.documentElement.style.colorScheme = detail.themeDark ? "dark" : "light";
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    try {
      const saved = localStorage.getItem("sas_settings");
      const prev: SasSettings = saved ? JSON.parse(saved) : {};
      const merged: SasSettings = { ...prev, themeDark: next };
      localStorage.setItem("sas_settings", JSON.stringify(merged));
      document.documentElement.style.colorScheme = next ? "dark" : "light";
      window.dispatchEvent(new CustomEvent<SettingsEventDetail>(SETTINGS_CHANGED_EVENT, { detail: { themeDark: next } }));
    } catch {}
  };

  const toggleSort = (key: keyof Account) => {
    if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const roleKeyFilter = ROLE_FILTER_LABEL_TO_KEY[filterRole] ?? null;

    const filteredData = list.filter((account) => {
      const matchesSearch = !searchTerm
        || [account.name, account.email, account.code]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(searchTerm));
      if (!matchesSearch) return false;

      if (roleKeyFilter && account.roleKey !== roleKeyFilter) return false;

      return true;
    });

    const getComparableValue = (account: Account, key: keyof Account) => {
      const value = account[key];
      if (value == null) return "";
      if (typeof value === "string") return value.toLowerCase();
      return String(value).toLowerCase();
    };

    const sorted = [...filteredData].sort((a, b) => {
      const va = getComparableValue(a, sortKey);
      const vb = getComparableValue(b, sortKey);
      const result = va.localeCompare(vb, "vi");
      return sortAsc ? result : -result;
    });

    return sorted;
  }, [list, search, filterRole, sortKey, sortAsc]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageData = filtered.slice((page-1)*pageSize, page*pageSize);

  const allSelected = selected.size > 0 && pageData.every((a) => selected.has(a.id));
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set()); else setSelected(new Set(pageData.map(a=>a.id)));
  };
  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const bulkDelete = () => {
    if (!confirm("Xóa các tài khoản đã chọn?")) return;
    updateList((prev) => prev.filter((a) => !selected.has(a.id)));
    setSelected(new Set());
  };

  const onOpenCreate = () => { setEdit(null); setModalOpen(true); };
  const onOpenEdit = (a: Account) => { setEdit(a); setModalOpen(true); };

  const stats = useMemo(() => {
    return {
      total: summary.total,
      gv: summary.byRole.teacher,
      sv: summary.byRole.student,
      ad: summary.byRole.admin,
      locked: summary.byStatus.locked,
      pending: summary.byStatus.pending,
    };
  }, [summary]);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formRole, setFormRole] = useState<Role>("Sinh viên");
  const [formStatus, setFormStatus] = useState<Status>("Hoạt động");
  const [formPassword, setFormPassword] = useState("");
  const [formNote, setFormNote] = useState("");
  const [perm, setPerm] = useState<Record<string, boolean>>({
    view_students: true,
    edit_schedule: true,
    manage_lecturers: false,
    export_reports: true,
  });

  useEffect(() => {
    if (edit) {
      setFormName(edit.name); setFormEmail(edit.email); setFormCode(edit.code); setFormRole(edit.role); setFormStatus(edit.status); setFormPassword(""); setFormNote("");
      setPerm({ view_students: true, edit_schedule: true, manage_lecturers: edit.role!=="Sinh viên", export_reports: true });
    } else {
      setFormName(""); setFormEmail(""); setFormCode(""); setFormRole("Sinh viên"); setFormStatus("Hoạt động"); setFormPassword(""); setFormNote("");
      setPerm({ view_students: true, edit_schedule: false, manage_lecturers: false, export_reports: false });
    }
  }, [modalOpen, edit]);

  const randomPass = () => Math.random().toString(36).slice(2, 10);
  const onSubmit = (sendMail: boolean) => {
    const normalizedRoleKey = roleLabelToKey(formRole);
    const normalizedStatusKey = statusLabelToKey(formStatus);
    if (edit) {
      updateList((prev) =>
        prev.map((a) =>
          a.id === edit.id
            ? {
                ...a,
                name: formName,
                email: formEmail,
                code: formCode,
                role: formRole,
                roleKey: normalizedRoleKey,
                status: formStatus,
                statusKey: normalizedStatusKey,
              }
            : a,
        ),
      );
    } else {
      const id = Math.random().toString(36).slice(2, 9);
      const autoCode = formCode ||
        (formRole === "Sinh viên"
          ? `SV${Date.now().toString().slice(-5)}`
          : formRole === "Giảng viên"
            ? `GV${Date.now().toString().slice(-4)}`
            : `AD${Date.now().toString().slice(-3)}`);
      const avatar = AVATAR_MAP[normalizedRoleKey] ?? "👥";
      const newAccount: Account = {
        id,
        avatar,
        name: formName,
        code: autoCode,
        email: formEmail,
        role: formRole,
        roleKey: normalizedRoleKey,
        status: formStatus,
        statusKey: normalizedStatusKey,
        lastLogin: "--",
        lastLoginRaw: null,
        createdAt: new Date().toISOString(),
      };
      updateList((prev) => prev.concat(newAccount));
    }
    if (!formPassword) setFormPassword(randomPass());
    setModalOpen(false);
    if (sendMail) alert("Đã gửi email thông báo tài khoản");
  };

  const onResetPassword = (acc: Account) => { setResetOpen(acc); };
  const doResetPassword = () => { setResetOpen(null); alert("Đã đặt lại mật khẩu và gửi email"); };

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
          <Link href="/lophoc_ad" className="side-link" title="Lớp học">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/lichhoc_ad" className="side-link" title="Lịch học">📅 {!collapsed && "Lịch học"}</Link>
          <Link href="/taikhoan_ad" className="side-link active" title="Tài khoản">🔑 {!collapsed && "Tài khoản"}</Link>
          <Link href="/caidat_ad" className="side-link" title="Cấu hình">⚙️ {!collapsed && "Cấu hình"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="top-left">
          <div className="page-title">Quản lý Tài khoản</div>
        </div>
        <div className="controls">
          <div className="search">
            <i className="fas fa-search" />
            <input value={search} onChange={(e)=>{ setSearch(e.target.value); setPage(1); }} placeholder="Tìm tên, email, mã số" />
          </div>
          <div className="filter-line">
            <select className="input" value={filterRole} onChange={(e)=>{ setFilterRole(e.target.value); setPage(1); }}>
              <option>Tất cả vai trò</option>
              <option>Admin</option>
              <option>Giảng viên</option>
              <option>Sinh viên</option>
            </select>
          </div>
          <button className="btn-primary" onClick={onOpenCreate}>+ Tạo tài khoản mới</button>
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

  const anySelected = selected.size > 0;

  return (
    <Shell>
      <section className="cards">
        <div className="card">
          <div className="card-title">👥 Tổng tài khoản</div>
          <div className="card-num">{stats.total.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="card-title">🧑‍🏫 Giảng viên</div>
          <div className="card-num">{stats.gv}</div>
        </div>
        <div className="card">
          <div className="card-title">🎓 Sinh viên</div>
          <div className="card-num">{stats.sv}</div>
        </div>
        <div className="card">
          <div className="card-title">🛠 Admin</div>
          <div className="card-num">{stats.ad}</div>
        </div>
        <div className="card">
          <div className="card-title">⚠️ Bị khóa</div>
          <div className="card-num">{stats.locked}</div>
        </div>
        <div className="card">
          <div className="card-title">🔐 Chưa kích hoạt</div>
          <div className="card-num">{stats.pending}</div>
        </div>
      </section>

      <div className="toolbar-sub">
        <div className="left">
          <button className="chip danger" disabled={!anySelected} onClick={bulkDelete}>🗑 Xóa</button>
        </div>
        <div className="right">{anySelected ? `${selected.size} đã chọn` : ""}</div>
      </div>

      <div className="panel">
        <div className="table accounts-table">
          <div className="thead">
            <div><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /></div>
            <div>Avatar</div>
            <div className="th" onClick={() => toggleSort("name")}>Họ tên</div>
            <div className="th" onClick={() => toggleSort("code")}>Mã</div>
            <div className="th" onClick={() => toggleSort("email")}>Email</div>
            <div className="th" onClick={() => toggleSort("role")}>Vai trò</div>
            <div className="th" onClick={() => toggleSort("status")}>Trạng thái</div>
            <div className="th" onClick={() => toggleSort("lastLogin")}>Đăng nhập gần nhất</div>
            <div>Hành động</div>
          </div>
          <div className="tbody">
            {loading && (
              <div className="trow" style={{ justifyContent: "center", color: "#64748b" }}>
                ⏳ Đang tải dữ liệu...
              </div>
            )}
            {!loading && error && (
              <div className="trow" style={{ justifyContent: "center", color: "#dc2626" }}>
                ⚠️ {error}
              </div>
            )}
            {!loading && !error && pageData.length === 0 && (
              <div className="trow" style={{ justifyContent: "center", color: "#64748b" }}>
                📭 Không có tài khoản phù hợp
              </div>
            )}
            {pageData.map((a) => (
              <div className="trow" key={a.id}>
                <div>
                  <input
                    type="checkbox"
                    checked={selected.has(a.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(a.id);
                    }}
                  />
                </div>
                <div>{a.avatar}</div>
                <div>{a.name}</div>
                <div>{a.code}</div>
                <div>{a.email}</div>
                <div>
                  <span className="pill role">{a.role}</span>
                </div>
                <div>
                  <span className={`status ${a.status}`.replace(/\s/g, "-")}>{a.status}</span>
                </div>
                <div>{a.lastLogin}</div>
                <div className="actions">
                  <button
                    className="icon-btn"
                    title="Sửa"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEdit(a);
                    }}
                  >
                    ✏️
                  </button>
                  {a.status !== "Hoạt động" ? (
                    <button
                      className="icon-btn"
                      title="Mở khóa"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateList((prev) =>
                          prev.map((x) =>
                            x.id === a.id
                              ? { ...x, status: "Hoạt động", statusKey: "active" }
                              : x,
                          ),
                        );
                      }}
                    >
                      🔓
                    </button>
                  ) : (
                    <button
                      className="icon-btn"
                      title="Khóa"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateList((prev) =>
                          prev.map((x) =>
                            x.id === a.id
                              ? { ...x, status: "Bị khóa", statusKey: "locked" }
                              : x,
                          ),
                        );
                      }}
                    >
                      🔒
                    </button>
                  )}
                  <button
                    className="icon-btn"
                    title="Đặt lại mật khẩu"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResetPassword(a);
                    }}
                  >
                    🔄
                  </button>
                  <button
                    className="icon-btn"
                    title="Xóa"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Xóa tài khoản?")) {
                        updateList((prev) => prev.filter((x) => x.id !== a.id));
                      }
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="pagination">
          <button
            className="chip"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            « Trước
          </button>
          <span className="page-info">
            Trang {page}/{totalPages}
          </span>
          <button
            className="chip"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Sau »
          </button>
        </div>
      </div>

      <div
        className={`modal ${resetOpen ? "" : "hidden"}`}
        onClick={() => resetOpen && setResetOpen(null)}
      >
        <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <div className="title">Đặt lại mật khẩu</div>
            <button className="icon-btn" onClick={() => setResetOpen(null)}>
              ✖
            </button>
          </div>
          <div className="modal-body">
            {resetOpen && (
              <div>
                Bạn có chắc muốn đặt lại mật khẩu cho tài khoản <strong>{resetOpen.name}</strong>?
              </div>
            )}
          </div>
          <div className="modal-foot">
            <button className="qr-btn" onClick={() => setResetOpen(null)}>
              Hủy
            </button>
            <button className="qr-btn" onClick={doResetPassword}>
              ✅ Đồng ý
            </button>
          </div>
        </div>
      </div>

      <div
        className={`modal ${modalOpen ? "" : "hidden"}`}
        onClick={() => modalOpen && setModalOpen(false)}
      >
        <div className="modal-content account-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <div className="title">{edit ? "Chỉnh sửa tài khoản" : "Tạo tài khoản mới"}</div>
            <button className="icon-btn" onClick={() => setModalOpen(false)}>
              ✖
            </button>
          </div>
          <div className="modal-body account-grid">
            <div className="form-panel">
              <div className="panel-header">
                <div className="panel-title">Thông tin tài khoản</div>
              </div>
              <div className="panel-body">
                <div className="field">
                  <label className="label">Họ và tên</label>
                  <input
                    className="input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="field">
                  <label className="label">Email đăng nhập</label>
                  <input
                    className="input"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@school.edu.vn"
                  />
                </div>
                <div className="field">
                  <label className="label">Mã số</label>
                  <input
                    className="input"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="SVxxxx / GVxxx / ADxxx"
                  />
                </div>
                <div className="field two-cols">
                  <div>
                    <label className="label">Vai trò</label>
                    <select
                      className="input"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as Role)}
                    >
                      <option>Admin</option>
                      <option>Giảng viên</option>
                      <option>Sinh viên</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Trạng thái</label>
                    <select
                      className="input"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as Status)}
                    >
                      <option>Hoạt động</option>
                      <option>Bị khóa</option>
                      <option>Chờ kích hoạt</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="label">Mật khẩu</label>
                  <div className="inline">
                    <input
                      className="input"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Tự động nếu để trống"
                    />
                    <button className="chip" onClick={() => setFormPassword(randomPass())}>
                      Tạo ngẫu nhiên
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="form-panel secondary">
              <div className="panel-header">
                <div className="panel-title">Tóm tắt & phân quyền</div>
              </div>
              <div className="panel-body">
                <div className="summary-box">
                  <div className="summary-item">
                    <span className="summary-icon">🆔</span>
                    <span>Mã số: {formCode || "Chưa nhập"}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">🎯</span>
                    <span>Vai trò: {formRole}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">📨</span>
                    <span>Email: {formEmail || "Chưa nhập"}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">💡</span>
                    <span>Trạng thái: {formStatus}</span>
                  </div>
                </div>
                <label className="label">Ghi chú</label>
                <textarea
                  className="input"
                  rows={3}
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Ghi chú nếu cần..."
                ></textarea>
                <div className="section-title">Phân quyền chi tiết</div>
                <div className="perm-list">
                  <label>
                    <input
                      type="checkbox"
                      checked={perm.view_students}
                      onChange={(e) =>
                        setPerm((prev) => ({ ...prev, view_students: e.target.checked }))
                      }
                    />{" "}
                    Xem danh sách sinh viên
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={perm.edit_schedule}
                      onChange={(e) =>
                        setPerm((prev) => ({ ...prev, edit_schedule: e.target.checked }))
                      }
                    />{" "}
                    Chỉnh sửa lịch học
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={perm.manage_lecturers}
                      onChange={(e) =>
                        setPerm((prev) => ({ ...prev, manage_lecturers: e.target.checked }))
                      }
                    />{" "}
                    Quản lý giảng viên
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={perm.export_reports}
                      onChange={(e) =>
                        setPerm((prev) => ({ ...prev, export_reports: e.target.checked }))
                      }
                    />{" "}
                    Xuất báo cáo
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-foot account-foot">
            <button className="qr-btn ghost" onClick={() => setModalOpen(false)}>
              Hủy
            </button>
            <div className="actions-row">
              <button className="qr-btn" onClick={() => onSubmit(false)}>
                💾 Lưu
              </button>
              <button className="qr-btn" onClick={() => onSubmit(true)}>
                📩 Lưu & Gửi mail
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

