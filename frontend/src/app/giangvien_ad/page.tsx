"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Lecturer = {
  id: string;
  code: string;
  name: string;
  dept: string;
  faculty: string;
  classes: number;
  status: "Đang dạy" | "Tạm nghỉ" | "Thôi việc";
  email?: string;
  phone?: string;
};

export default function AdminLecturersPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount] = useState(1);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("Tất cả bộ môn");
  const [filterFaculty, setFilterFaculty] = useState("Tất cả khoa");
  const [filterStatus, setFilterStatus] = useState("Tất cả trạng thái");
  const [list, setList] = useState<Lecturer[]>([]);
  const [sortKey, setSortKey] = useState<keyof Lecturer>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<Lecturer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState<Lecturer | null>(null);

  useEffect(() => {
    setList([
      { id: "1", code: "GV001", name: "Nguyễn Văn A", dept: "Lập trình", faculty: "CNTT", classes: 4, status: "Đang dạy", email: "a@uni.edu", phone: "0901" },
      { id: "2", code: "GV002", name: "Trần Thị B", dept: "Cơ sở dữ liệu", faculty: "CNTT", classes: 2, status: "Tạm nghỉ", email: "b@uni.edu", phone: "0902" },
      { id: "3", code: "GV003", name: "Phạm Minh C", dept: "Hệ thống nhúng", faculty: "Điện - Điện tử", classes: 3, status: "Đang dạy", email: "c@uni.edu", phone: "0903" },
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

  const toggleSort = (key: keyof Lecturer) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    let data = list.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()) || (s.email||"").toLowerCase().includes(search.toLowerCase()) || s.dept.toLowerCase().includes(search.toLowerCase())
    );
    if (filterDept !== "Tất cả bộ môn") data = data.filter((s) => s.dept === filterDept);
    if (filterFaculty !== "Tất cả khoa") data = data.filter((s) => s.faculty === filterFaculty);
    if (filterStatus !== "Tất cả trạng thái") data = data.filter((s) => s.status === filterStatus);
    data.sort((a: any, b: any) => {
      const va = (a[sortKey] || "").toString().toLowerCase();
      const vb = (b[sortKey] || "").toString().toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return data;
  }, [list, search, filterDept, filterFaculty, filterStatus, sortKey, sortAsc]);

  const allSelected = selected.size > 0 && filtered.every((s) => selected.has(s.id));
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((s) => s.id)));
  };
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkStatus = (status: Lecturer["status"]) => {
    setList((prev) => prev.map((s) => (selected.has(s.id) ? { ...s, status } : s)));
    setSelected(new Set());
  };
  const bulkDelete = () => {
    if (!confirm("Xóa các giảng viên đã chọn?")) return;
    setList((prev) => prev.filter((s) => !selected.has(s.id)));
    setSelected(new Set());
  };

  const onOpenCreate = () => { setEdit(null); setModalOpen(true); };
  const onOpenEdit = (s: Lecturer) => { setEdit(s); setModalOpen(true); };

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDept, setFormDept] = useState("Lập trình");
  const [formFaculty, setFormFaculty] = useState("CNTT");
  const [formStatus, setFormStatus] = useState<Lecturer["status"]>("Đang dạy");
  const [formClasses, setFormClasses] = useState<string[]>([]);

  useEffect(() => {
    if (edit) {
      setFormName(edit.name); setFormCode(edit.code); setFormEmail(edit.email||""); setFormPhone(edit.phone||"");
      setFormDept(edit.dept); setFormFaculty(edit.faculty); setFormStatus(edit.status);
      setFormClasses([]);
    } else {
      setFormName(""); setFormCode(""); setFormEmail(""); setFormPhone("");
      setFormDept("Lập trình"); setFormFaculty("CNTT"); setFormStatus("Đang dạy");
      setFormClasses([]);
    }
  }, [modalOpen, edit]);

  const onSubmit = () => {
    if (edit) {
      setList((prev) => prev.map((s) => (s.id === edit.id ? { ...s, name: formName, code: formCode, email: formEmail, phone: formPhone, dept: formDept, faculty: formFaculty, status: formStatus } : s)));
    } else {
      const id = Math.random().toString(36).slice(2, 9);
      setList((prev) => prev.concat({ id, name: formName, code: formCode || `GV${Date.now().toString().slice(-5)}`, email: formEmail, phone: formPhone, dept: formDept, faculty: formFaculty, status: formStatus, classes: 0 }));
    }
    setModalOpen(false);
  };

  const stats = useMemo(() => {
    const total = list.length;
    const teaching = list.filter((x) => x.status === "Đang dạy").length;
    const resting = list.filter((x) => x.status === "Tạm nghỉ").length;
    const totalClasses = list.reduce((a, b) => a + (b.classes || 0), 0);
    return { total, teaching, resting, totalClasses };
  }, [list]);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className={`layout ${collapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="side-header">
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Mở rộng" : "Thu gọn"}>
            {collapsed ? "➡️" : "⬅️"}
          </button>
          {!collapsed && <div className="side-name">Smart Attendance</div>}
        </div>
        <nav className="side-nav">
          <Link href="/tongquan_ad" className="side-link" title="Dashboard">🏠 {!collapsed && "Dashboard"}</Link>
          <Link href="/thongbao_ad" className="side-link" title="Thông báo">📢 {!collapsed && "Thông báo"}</Link>
          <Link href="/sinhvien_ad" className="side-link" title="Sinh viên">👨‍🎓 {!collapsed && "Sinh viên"}</Link>
          <Link href="/giangvien_ad" className="side-link active" title="Giảng viên">👩‍🏫 {!collapsed && "Giảng viên"}</Link>
          <a className="side-link" href="#" onClick={(e)=>{e.preventDefault(); router.push("/quanly_lophoc");}} title="Lớp học">🏫 {!collapsed && "Lớp học"}</a>
          <Link href="/lichgiangday_gv" className="side-link" title="Lịch học">📅 {!collapsed && "Lịch học"}</Link>
          <Link href="/login" className="side-link" title="Tài khoản">🔑 {!collapsed && "Tài khoản"}</Link>
          <Link href="/caidat_sv" className="side-link" title="Cấu hình">⚙️ {!collapsed && "Cấu hình"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="top-left">
          <div className="page-title">Quản lý Giảng viên</div>
        </div>
        <div className="controls">
          <div className="search">
            <i className="fas fa-search" />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Tìm tên, mã GV, email, bộ môn" />
          </div>
          <div className="filter-line">
            <select className="input" value={filterDept} onChange={(e)=>setFilterDept(e.target.value)}>
              <option>Tất cả bộ môn</option>
              <option>Lập trình</option>
              <option>Cơ sở dữ liệu</option>
              <option>Hệ thống nhúng</option>
            </select>
            <select className="input" value={filterFaculty} onChange={(e)=>setFilterFaculty(e.target.value)}>
              <option>Tất cả khoa</option>
              <option>CNTT</option>
              <option>Điện - Điện tử</option>
            </select>
            <select className="input" value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)}>
              <option>Tất cả trạng thái</option>
              <option>Đang dạy</option>
              <option>Tạm nghỉ</option>
              <option>Thôi việc</option>
            </select>
          </div>
          <button className="btn-primary" onClick={onOpenCreate}>+ Thêm giảng viên</button>
          <button className="btn-outline" onClick={()=>alert("Xuất danh sách CSV/Excel")}>Xuất danh sách</button>
          <button className="icon-btn" onClick={toggleDark} title="Chuyển giao diện">{dark?"🌙":"🌞"}</button>
          <button className="icon-btn notif" title="Thông báo">🔔{notifCount>0 && <span className="badge">{notifCount}</span>}</button>
          <div className="avatar-menu">
            <div className="avatar">🧑‍💼</div>
            <div className="dropdown">
              <a href="#" onClick={(e)=>e.preventDefault()}>Hồ sơ</a>
              <a href="#" onClick={(e)=>{e.preventDefault(); if(confirm("Đăng xuất?")){ localStorage.removeItem("sas_user"); router.push("/login"); }}}>Đăng xuất</a>
            </div>
          </div>
        </div>
      </header>

      <main className="main">{children}</main>
    </div>
  );

  const anySelected = selected.size > 0;

  return (
    <Shell>
      <section className="cards">
        <div className="card"><div className="card-title">👨‍🏫 Tổng số</div><div className="card-num">{stats.total}</div></div>
        <div className="card"><div className="card-title">🏫 Đang dạy</div><div className="card-num">{stats.teaching}</div></div>
        <div className="card"><div className="card-title">💤 Tạm nghỉ</div><div className="card-num">{stats.resting}</div></div>
        <div className="card"><div className="card-title">🔁 Tổng lớp</div><div className="card-num">{stats.totalClasses}</div></div>
      </section>

      <div className="toolbar-sub">
        <div className="left">
          <button className="chip" disabled={!anySelected} onClick={()=>bulkStatus("Đang dạy")}>🔄 Cập nhật: Đang dạy</button>
          <button className="chip" disabled={!anySelected} onClick={()=>bulkStatus("Tạm nghỉ")}>🔄 Cập nhật: Tạm nghỉ</button>
          <button className="chip" disabled={!anySelected} onClick={()=>bulkStatus("Thôi việc")}>🔄 Cập nhật: Thôi việc</button>
          <button className="chip" onClick={()=>alert("Nhập Excel")}>📥 Nhập danh sách</button>
          <button className="chip" onClick={()=>alert("Xuất CSV/Excel")}>📤 Xuất danh sách</button>
          <button className="chip danger" disabled={!anySelected} onClick={bulkDelete}>🗑 Xóa hàng loạt</button>
        </div>
        <div className="right">{anySelected ? `${selected.size} đã chọn` : ""}</div>
      </div>

      <div className="panel">
        <div className="table lecturers-table">
          <div className="thead">
            <div><input type="checkbox" checked={anySelected && filtered.every(s=>selected.has(s.id))} onChange={() => { if (anySelected && filtered.every(s=>selected.has(s.id))) setSelected(new Set()); else setSelected(new Set(filtered.map(s=>s.id))); }} /></div>
            <div className="th" onClick={()=>toggleSort("code")}>Mã GV</div>
            <div className="th" onClick={()=>toggleSort("name")}>Họ tên</div>
            <div className="th" onClick={()=>toggleSort("dept")}>Bộ môn</div>
            <div className="th" onClick={()=>toggleSort("faculty")}>Khoa</div>
            <div className="th" onClick={()=>toggleSort("classes")}>Số lớp</div>
            <div className="th" onClick={()=>toggleSort("status")}>Trạng thái</div>
            <div>Thao tác</div>
          </div>
          <div className="tbody">
            {filtered.map((s) => (
              <div className="trow" key={s.id} onClick={() => setDrawer(s)}>
                <div><input type="checkbox" checked={selected.has(s.id)} onChange={(e)=>{e.stopPropagation(); toggleSelect(s.id);}} /></div>
                <div>{s.code}</div>
                <div>{s.name}</div>
                <div>{s.dept}</div>
                <div>{s.faculty}</div>
                <div>{s.classes}</div>
                <div><span className={`status ${s.status}`.replace(/\s/g,"-")}>{s.status}</span></div>
                <div className="actions">
                  <button className="icon-btn" title="Xem" onClick={(e)=>{e.stopPropagation(); setDrawer(s);}}>👁</button>
                  <button className="icon-btn" title="Sửa" onClick={(e)=>{e.stopPropagation(); onOpenEdit(s);}}>✏️</button>
                  <button className="icon-btn" title="Xóa" onClick={(e)=>{e.stopPropagation(); if(confirm("Xóa giảng viên?")) setList(prev=>prev.filter(x=>x.id!==s.id));}}>🗑</button>
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
                <div className="avatar-lg">{drawer.name.split(" ").map(w=>w[0]).slice(-2).join("")}</div>
                <div className="kv"><span className="k">Email</span><span className="v">{drawer.email||"--"}</span></div>
                <div className="kv"><span className="k">SĐT</span><span className="v">{drawer.phone||"--"}</span></div>
                <div className="kv"><span className="k">Bộ môn</span><span className="v">{drawer.dept}</span></div>
                <div className="kv"><span className="k">Khoa</span><span className="v">{drawer.faculty}</span></div>
                <div className="kv"><span className="k">Trạng thái</span><span className="v"><span className={`status ${drawer.status}`.replace(/\s/g,"-")}>{drawer.status}</span></span></div>
                <div className="actions-row">
                  <button className="qr-btn" onClick={()=>{ setDrawer(null); onOpenEdit(drawer); }}>✏️ Chỉnh sửa</button>
                  <button className="qr-btn" onClick={()=>alert("Gán/Thay đổi lớp giảng dạy")}>🔁 Gán lớp</button>
                  <button className="qr-btn" onClick={()=>setList(prev=>prev.map(x=>x.id===drawer.id?{...x,status:x.status==="Đang dạy"?"Tạm nghỉ":"Đang dạy"}:x))}>{drawer.status==="Đang dạy"?"⏸ Tạm nghỉ":"▶️ Đang dạy"}</button>
                  <button className="qr-btn" onClick={()=>{ if(confirm("Xóa giảng viên?")){ setList(prev=>prev.filter(x=>x.id!==drawer.id)); setDrawer(null);} }}>🗑 Xóa</button>
                </div>
              </div>
              <div>
                <div className="section-title">Môn giảng dạy</div>
                <div className="chips">
                  <span className="pill">Lập trình Web</span>
                  <span className="pill">Cơ sở dữ liệu</span>
                </div>
                <div className="section-title">Số lớp đang phụ trách</div>
                <div className="pill">{drawer.classes} lớp</div>
                <div className="section-title">Sinh viên tiêu biểu</div>
                <div className="list small">
                  <div>SE12345 - Nguyễn Minh Hào - 9.0 Web</div>
                  <div>SE12347 - Phạm Anh Tuấn - 8.5 CSDL</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="title">{edit?"Chỉnh sửa giảng viên":"Thêm giảng viên"}</div>
              <button className="icon-btn" onClick={() => setModalOpen(false)}>✖</button>
            </div>
            <div className="modal-body grid2">
              <div className="form-col">
                <label className="label">Họ tên</label>
                <input className="input" value={formName} onChange={(e)=>setFormName(e.target.value)} placeholder="Nguyễn Văn A" />
                <label className="label">Mã giảng viên</label>
                <input className="input" value={formCode} onChange={(e)=>setFormCode(e.target.value)} placeholder="GV001" />
                <label className="label">Email</label>
                <input className="input" value={formEmail} onChange={(e)=>setFormEmail(e.target.value)} placeholder="email@domain.com" />
                <label className="label">Số điện thoại</label>
                <input className="input" value={formPhone} onChange={(e)=>setFormPhone(e.target.value)} placeholder="090x..." />
              </div>
              <div className="form-col">
                <label className="label">Bộ môn</label>
                <select className="input" value={formDept} onChange={(e)=>setFormDept(e.target.value)}>
                  <option>Lập trình</option>
                  <option>Cơ sở dữ liệu</option>
                  <option>Hệ thống nhúng</option>
                </select>
                <label className="label">Khoa</label>
                <select className="input" value={formFaculty} onChange={(e)=>setFormFaculty(e.target.value)}>
                  <option>CNTT</option>
                  <option>Điện - Điện tử</option>
                </select>
                <label className="label">Trạng thái</label>
                <select className="input" value={formStatus} onChange={(e)=>setFormStatus(e.target.value as any)}>
                  <option>Đang dạy</option>
                  <option>Tạm nghỉ</option>
                  <option>Thôi việc</option>
                </select>
                <label className="label">Lớp phụ trách</label>
                <select className="input" multiple value={formClasses} onChange={(e)=>setFormClasses(Array.from(e.target.selectedOptions).map(o=>o.value))}>
                  <option>SE1601</option>
                  <option>SE1602</option>
                  <option>JS22</option>
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button className="qr-btn" onClick={()=>setModalOpen(false)}>Hủy</button>
              <button className="qr-btn" onClick={onSubmit}>💾 Lưu</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

