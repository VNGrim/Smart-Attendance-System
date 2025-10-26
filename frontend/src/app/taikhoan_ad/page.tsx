"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "Admin" | "Giảng viên" | "Sinh viên";
type Status = "Hoạt động" | "Bị khóa" | "Chờ kích hoạt";

type Account = {
  id: string;
  avatar: string;
  name: string;
  code: string;
  email: string;
  role: Role;
  status: Status;
  lastLogin: string;
  createdAt?: string;
};

export default function AdminAccountsPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount] = useState(2);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("Tất cả vai trò");
  const [filterStatus, setFilterStatus] = useState("Tất cả trạng thái");
  const [filterDate, setFilterDate] = useState("Tất cả");
  const [list, setList] = useState<Account[]>([]);
  const [sortKey, setSortKey] = useState<keyof Account>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState<null | Account>(null);
  const [edit, setEdit] = useState<Account | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setList([
      { id: "1", avatar: "🧑", name: "Nguyễn Văn A", code: "GV001", email: "a.nguyen@school.edu.vn", role: "Giảng viên", status: "Hoạt động", lastLogin: "2025-10-23 08:30" },
      { id: "2", avatar: "🎓", name: "Trần Thị B", code: "SV203", email: "b.tran@school.edu.vn", role: "Sinh viên", status: "Bị khóa", lastLogin: "2025-10-20 19:00" },
      { id: "3", avatar: "👤", name: "Lê Văn C", code: "AD001", email: "admin@school.edu.vn", role: "Admin", status: "Hoạt động", lastLogin: "2025-10-25 09:00" },
      { id: "4", avatar: "🎓", name: "Phạm Minh D", code: "SV204", email: "d.pham@school.edu.vn", role: "Sinh viên", status: "Chờ kích hoạt", lastLogin: "--" },
      { id: "5", avatar: "🧑", name: "Vũ Thị E", code: "GV010", email: "e.vu@school.edu.vn", role: "Giảng viên", status: "Hoạt động", lastLogin: "2025-10-24 10:15" },
    ]);
    try {
      const saved = localStorage.getItem("sas_settings");
      if (saved) {
        const s = JSON.parse(saved);
        setDark(!!s.themeDark);
        document.documentElement.style.colorScheme = s.themeDark ? "dark" : "light";
      }
    } catch {}
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

  const toggleSort = (key: keyof Account) => {
    if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    let data = list.filter((a) => (
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase())
    ));
    if (filterRole !== "Tất cả vai trò") data = data.filter(a => a.role === filterRole);
    if (filterStatus !== "Tất cả trạng thái") data = data.filter(a => a.status === filterStatus);
    if (filterDate === "7 ngày") data = data.filter(a => a.lastLogin !== "--");
    data.sort((a: any, b: any) => {
      const va = (a[sortKey] || "").toString().toLowerCase();
      const vb = (b[sortKey] || "").toString().toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return data;
  }, [list, search, filterRole, filterStatus, filterDate, sortKey, sortAsc]);

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

  const bulkLock = (lock: boolean) => {
    setList((prev) => prev.map((a) => (selected.has(a.id) ? { ...a, status: lock?"Bị khóa":"Hoạt động" } : a)));
    setSelected(new Set());
  };
  const bulkDelete = () => {
    if (!confirm("Xóa các tài khoản đã chọn?")) return;
    setList((prev) => prev.filter((a) => !selected.has(a.id)));
    setSelected(new Set());
  };

  const onOpenCreate = () => { setEdit(null); setModalOpen(true); };
  const onOpenEdit = (a: Account) => { setEdit(a); setModalOpen(true); };

  const stats = useMemo(() => {
    const total = list.length || 1245;
    const gv = list.filter(x=>x.role === "Giảng viên").length || 120;
    const sv = list.filter(x=>x.role === "Sinh viên").length || 1100;
    const ad = list.filter(x=>x.role === "Admin").length || 25;
    const locked = list.filter(x=>x.status === "Bị khóa").length || 15;
    const pending = list.filter(x=>x.status === "Chờ kích hoạt").length || 10;
    return { total, gv, sv, ad, locked, pending };
  }, [list]);

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
    if (edit) {
      setList(prev=> prev.map(a=> a.id===edit.id ? { ...a, name: formName, email: formEmail, code: formCode, role: formRole, status: formStatus } : a));
    } else {
      const id = Math.random().toString(36).slice(2, 9);
      setList(prev=> prev.concat({ id, avatar: formRole==="Sinh viên"?"🎓": formRole==="Giảng viên"?"🧑":"👤", name: formName, code: formCode || (formRole==="Sinh viên"?`SV${Date.now().toString().slice(-5)}`: formRole==="Giảng viên"?`GV${Date.now().toString().slice(-4)}`:`AD${Date.now().toString().slice(-3)}`), email: formEmail, role: formRole, status: formStatus, lastLogin: "--" }));
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
            <select className="input" value={filterStatus} onChange={(e)=>{ setFilterStatus(e.target.value); setPage(1); }}>
              <option>Tất cả trạng thái</option>
              <option>Hoạt động</option>
              <option>Bị khóa</option>
              <option>Chờ kích hoạt</option>
            </select>
            <select className="input" value={filterDate} onChange={(e)=>{ setFilterDate(e.target.value); setPage(1); }}>
              <option>Tất cả</option>
              <option>7 ngày</option>
            </select>
          </div>
          <button className="btn-primary" onClick={onOpenCreate}>+ Tạo tài khoản mới</button>
          <button className="btn-outline" onClick={()=>alert("Xuất Excel/PDF")}>📋 Xuất danh sách</button>
          <button className="icon-btn" onClick={toggleDark} title="Chuyển giao diện">{dark?"🌙":"🌞"}</button>
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

  const anySelected = selected.size > 0;

  return (
    <Shell>
      <section className="cards">
        <div className="card"><div className="card-title">👥 Tổng tài khoản</div><div className="card-num">{stats.total.toLocaleString()}</div></div>
        <div className="card"><div className="card-title">🧑‍🏫 Giảng viên</div><div className="card-num">{stats.gv}</div></div>
        <div className="card"><div className="card-title">🎓 Sinh viên</div><div className="card-num">{stats.sv}</div></div>
        <div className="card"><div className="card-title">🛠 Admin</div><div className="card-num">{stats.ad}</div></div>
        <div className="card"><div className="card-title">⚠️ Bị khóa</div><div className="card-num">{stats.locked}</div></div>
        <div className="card"><div className="card-title">🔐 Chưa kích hoạt</div><div className="card-num">{stats.pending}</div></div>
      </section>

      <div className="toolbar-sub">
        <div className="left">
          <button className="chip" disabled={!anySelected} onClick={()=>bulkLock(false)}>✅ Mở khóa</button>
          <button className="chip" disabled={!anySelected} onClick={()=>bulkLock(true)}>🔒 Khóa tài khoản</button>
          <button className="chip" disabled={!anySelected} onClick={()=>alert("Gửi mail thông báo")}>📩 Gửi mail</button>
          <button className="chip danger" disabled={!anySelected} onClick={bulkDelete}>🗑 Xóa</button>
        </div>
        <div className="right">{anySelected ? `${selected.size} đã chọn` : ""}</div>
      </div>

      <div className="panel">
        <div className="table accounts-table">
          <div className="thead">
            <div><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /></div>
            <div>Avatar</div>
            <div className="th" onClick={()=>toggleSort("name")}>Họ tên</div>
            <div className="th" onClick={()=>toggleSort("code")}>Mã</div>
            <div className="th" onClick={()=>toggleSort("email")}>Email</div>
            <div className="th" onClick={()=>toggleSort("role")}>Vai trò</div>
            <div className="th" onClick={()=>toggleSort("status")}>Trạng thái</div>
            <div className="th" onClick={()=>toggleSort("lastLogin")}>Đăng nhập gần nhất</div>
            <div>Hành động</div>
          </div>
          <div className="tbody">
            {pageData.map((a) => (
              <div className="trow" key={a.id}>
                <div><input type="checkbox" checked={selected.has(a.id)} onChange={(e)=>{e.stopPropagation(); toggleSelect(a.id);}} /></div>
                <div>{a.avatar}</div>
                <div>{a.name}</div>
                <div>{a.code}</div>
                <div>{a.email}</div>
                <div><span className="pill role">{a.role}</span></div>
                <div><span className={`status ${a.status}`.replace(/\s/g,"-")}>{a.status}</span></div>
                <div>{a.lastLogin}</div>
                <div className="actions">
                  <button className="icon-btn" title="Sửa" onClick={(e)=>{e.stopPropagation(); onOpenEdit(a);}}>✏️</button>
                  {a.status!=="Hoạt động" ? (
                    <button className="icon-btn" title="Mở khóa" onClick={(e)=>{e.stopPropagation(); setList(prev=>prev.map(x=>x.id===a.id?{...x,status:"Hoạt động"}:x));}}>🔓</button>
                  ) : (
                    <button className="icon-btn" title="Khóa" onClick={(e)=>{e.stopPropagation(); setList(prev=>prev.map(x=>x.id===a.id?{...x,status:"Bị khóa"}:x));}}>🔒</button>
                  )}
                  <button className="icon-btn" title="Đặt lại mật khẩu" onClick={(e)=>{e.stopPropagation(); onResetPassword(a);}}>🔄</button>
                  <button className="icon-btn" title="Xóa" onClick={(e)=>{e.stopPropagation(); if(confirm("Xóa tài khoản?")) setList(prev=>prev.filter(x=>x.id!==a.id));}}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="pagination">
          <button className="chip" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>« Trước</button>
          <span className="page-info">Trang {page}/{totalPages}</span>
          <button className="chip" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Sau »</button>
        </div>
      </div>

      {resetOpen && (
        <div className="modal" onClick={()=>setResetOpen(null)}>
          <div className="modal-content small" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="title">Đặt lại mật khẩu</div>
              <button className="icon-btn" onClick={()=>setResetOpen(null)}>✖</button>
            </div>
            <div className="modal-body">
              <div>Bạn có chắc muốn đặt lại mật khẩu cho tài khoản <strong>{resetOpen.name}</strong>?</div>
            </div>
            <div className="modal-foot">
              <button className="qr-btn" onClick={()=>setResetOpen(null)}>Hủy</button>
              <button className="qr-btn" onClick={doResetPassword}>✅ Đồng ý</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal" onClick={() => setModalOpen(false)}>
          <div className="modal-content wide" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="title">{edit?"Chỉnh sửa tài khoản":"Tạo tài khoản mới"}</div>
              <button className="icon-btn" onClick={() => setModalOpen(false)}>✖</button>
            </div>
            <div className="modal-body grid2">
              <div className="form-col">
                <label className="label">Họ và tên</label>
                <input className="input" value={formName} onChange={(e)=>setFormName(e.target.value)} placeholder="Nguyễn Văn A" />
                <label className="label">Email đăng nhập</label>
                <input className="input" value={formEmail} onChange={(e)=>setFormEmail(e.target.value)} placeholder="email@school.edu.vn" />
                <label className="label">Mã số</label>
                <input className="input" value={formCode} onChange={(e)=>setFormCode(e.target.value)} placeholder="SVxxxx / GVxxx / ADxxx" />
                <label className="label">Vai trò</label>
                <select className="input" value={formRole} onChange={(e)=>setFormRole(e.target.value as Role)}>
                  <option>Admin</option>
                  <option>Giảng viên</option>
                  <option>Sinh viên</option>
                </select>
                <label className="label">Trạng thái</label>
                <select className="input" value={formStatus} onChange={(e)=>setFormStatus(e.target.value as Status)}>
                  <option>Hoạt động</option>
                  <option>Bị khóa</option>
                  <option>Chờ kích hoạt</option>
                </select>
                <label className="label">Mật khẩu</label>
                <div className="inline">
                  <input className="input" value={formPassword} onChange={(e)=>setFormPassword(e.target.value)} placeholder="Tự động nếu để trống" />
                  <button className="chip" onClick={()=>setFormPassword(randomPass())}>Tạo ngẫu nhiên</button>
                </div>
              </div>
              <div className="form-col">
                <label className="label">Ghi chú</label>
                <textarea className="input" rows={3} value={formNote} onChange={(e)=>setFormNote(e.target.value)} placeholder="Ghi chú nếu cần..."></textarea>
                <div className="section-title">Phân quyền chi tiết</div>
                <div className="perm-list">
                  <label><input type="checkbox" checked={perm.view_students} onChange={(e)=>setPerm(prev=>({...prev, view_students: e.target.checked}))} /> Xem danh sách sinh viên</label>
                  <label><input type="checkbox" checked={perm.edit_schedule} onChange={(e)=>setPerm(prev=>({...prev, edit_schedule: e.target.checked}))} /> Chỉnh sửa lịch học</label>
                  <label><input type="checkbox" checked={perm.manage_lecturers} onChange={(e)=>setPerm(prev=>({...prev, manage_lecturers: e.target.checked}))} /> Quản lý giảng viên</label>
                  <label><input type="checkbox" checked={perm.export_reports} onChange={(e)=>setPerm(prev=>({...prev, export_reports: e.target.checked}))} /> Xuất báo cáo</label>
                </div>
              </div>
            </div>
            <div className="modal-foot space">
              <button className="qr-btn" onClick={()=>setModalOpen(false)}>Hủy</button>
              <div className="actions-row">
                <button className="qr-btn" onClick={()=>onSubmit(false)}>💾 Lưu</button>
                <button className="qr-btn" onClick={()=>onSubmit(true)}>📩 Lưu & Gửi mail</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

