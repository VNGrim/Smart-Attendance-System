"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ClassItem = {
  id: string;
  code: string;
  name: string;
  cohort: string;
  major: string;
  teacher: string;
  teacherEmail?: string;
  students: number;
  status: "Đang hoạt động" | "Tạm nghỉ" | "Kết thúc";
};

type StudentRow = { mssv: string; name: string; status: string; email: string };

export default function AdminClassesPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount] = useState(1);
  const [search, setSearch] = useState("");
  const [filterFaculty, setFilterFaculty] = useState("Tất cả khoa");
  const [filterMajor, setFilterMajor] = useState("Tất cả ngành");
  const [filterCohort, setFilterCohort] = useState("Tất cả khóa");
  const [filterTeacher, setFilterTeacher] = useState("Tất cả giảng viên");
  const [filterStatus, setFilterStatus] = useState("Tất cả trạng thái");
  const [list, setList] = useState<ClassItem[]>([]);
  const [sortKey, setSortKey] = useState<keyof ClassItem>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<ClassItem | null>(null);
  const [drawerStudents, setDrawerStudents] = useState<StudentRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState<ClassItem | null>(null);

  useEffect(() => {
    setList([
      { id: "1", code: "SE1601", name: ".NET nâng cao", cohort: "K19", major: "CNTT", teacher: "Nguyễn Văn A", teacherEmail: "a@uni.edu", students: 32, status: "Đang hoạt động" },
      { id: "2", code: "SE1602", name: "Cơ sở dữ liệu", cohort: "K19", major: "CNTT", teacher: "Trần Thị B", teacherEmail: "b@uni.edu", students: 29, status: "Đang hoạt động" },
      { id: "3", code: "SE1603", name: "Cấu trúc dữ liệu", cohort: "K20", major: "CNTT", teacher: "Nguyễn Văn A", teacherEmail: "a@uni.edu", students: 25, status: "Kết thúc" },
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

  const toggleSort = (key: keyof ClassItem) => {
    if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    let data = list.filter((c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase()) || c.teacher.toLowerCase().includes(search.toLowerCase()) || c.cohort.toLowerCase().includes(search.toLowerCase())
    );
    if (filterMajor !== "Tất cả ngành") data = data.filter((c) => c.major === filterMajor);
    if (filterCohort !== "Tất cả khóa") data = data.filter((c) => c.cohort === filterCohort);
    if (filterTeacher !== "Tất cả giảng viên") data = data.filter((c) => c.teacher === filterTeacher);
    if (filterStatus !== "Tất cả trạng thái") data = data.filter((c) => c.status === filterStatus);
    data.sort((a: any, b: any) => {
      const va = (a[sortKey] ?? (sortKey === "students" ? 0 : "")).toString().toLowerCase();
      const vb = (b[sortKey] ?? (sortKey === "students" ? 0 : "")).toString().toLowerCase();
      if (sortKey === "students") return sortAsc ? (a.students - b.students) : (b.students - a.students);
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return data;
  }, [list, search, filterFaculty, filterMajor, filterCohort, filterTeacher, filterStatus, sortKey, sortAsc]);

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

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCohort, setFormCohort] = useState("K19");
  const [formMajor, setFormMajor] = useState("CNTT");
  const [formTeacher, setFormTeacher] = useState("Nguyễn Văn A");
  const [formStatus, setFormStatus] = useState<ClassItem["status"]>("Đang hoạt động");
  const [formStudents, setFormStudents] = useState<string>("");
  const [formDay, setFormDay] = useState("Thứ 3");
  const [formSlot, setFormSlot] = useState("Tiết 3-5");
  const [formRoom, setFormRoom] = useState("B206");

  useEffect(() => {
    if (edit) {
      setFormName(edit.name); setFormCode(edit.code); setFormCohort(edit.cohort); setFormMajor(edit.major); setFormTeacher(edit.teacher); setFormStatus(edit.status);
      setFormStudents(""); setFormDay("Thứ 3"); setFormSlot("Tiết 3-5"); setFormRoom("B206");
    } else {
      setFormName(""); setFormCode(""); setFormCohort("K19"); setFormMajor("CNTT"); setFormTeacher("Nguyễn Văn A"); setFormStatus("Đang hoạt động");
      setFormStudents(""); setFormDay("Thứ 3"); setFormSlot("Tiết 3-5"); setFormRoom("B206");
    }
  }, [modalOpen, edit]);

  const onSubmit = () => {
    if (edit) {
      setList((prev) => prev.map((c) => (c.id === edit.id ? { ...c, name: formName, code: formCode, cohort: formCohort, major: formMajor, teacher: formTeacher, status: formStatus } : c)));
    } else {
      const id = Math.random().toString(36).slice(2, 9);
      setList((prev) => prev.concat({ id, name: formName, code: formCode || `CL${Date.now().toString().slice(-5)}`, cohort: formCohort, major: formMajor, teacher: formTeacher, students: 0, status: formStatus }));
    }
    setModalOpen(false);
  };

  const stats = useMemo(() => {
    const total = list.length;
    const active = list.filter(x=>x.status === "Đang hoạt động").length;
    const teachers = new Set(list.map(x=>x.teacher)).size;
    const totalStudents = list.reduce((a,b)=>a + (b.students||0), 0);
    return { total, active, teachers, totalStudents };
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
          <Link href="/giangvien_ad" className="side-link" title="Giảng viên">👩‍🏫 {!collapsed && "Giảng viên"}</Link>
          <Link href="/lophoc_ad" className="side-link active" title="Lớp học">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/lichgiangday_gv" className="side-link" title="Lịch học">📅 {!collapsed && "Lịch học"}</Link>
          <Link href="/login" className="side-link" title="Tài khoản">🔑 {!collapsed && "Tài khoản"}</Link>
          <Link href="/caidat_sv" className="side-link" title="Cấu hình">⚙️ {!collapsed && "Cấu hình"}</Link>
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
          <div className="filter-line">
            <select className="input" value={filterMajor} onChange={(e)=>setFilterMajor(e.target.value)}>
              <option>Tất cả ngành</option>
              <option>CNTT</option>
              <option>Điện - Điện tử</option>
            </select>
            <select className="input" value={filterCohort} onChange={(e)=>setFilterCohort(e.target.value)}>
              <option>Tất cả khóa</option>
              <option>K19</option>
              <option>K20</option>
            </select>
            <select className="input" value={filterTeacher} onChange={(e)=>setFilterTeacher(e.target.value)}>
              <option>Tất cả giảng viên</option>
              <option>Nguyễn Văn A</option>
              <option>Trần Thị B</option>
            </select>
            <select className="input" value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)}>
              <option>Tất cả trạng thái</option>
              <option>Đang hoạt động</option>
              <option>Tạm nghỉ</option>
              <option>Kết thúc</option>
            </select>
          </div>
          <button className="btn-primary" onClick={onOpenCreate}>+ Tạo lớp mới</button>
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
        <div className="card"><div className="card-title">📚 Tổng số lớp</div><div className="card-num">{stats.total}</div></div>
        <div className="card"><div className="card-title">🏫 Đang hoạt động</div><div className="card-num">{stats.active}</div></div>
        <div className="card"><div className="card-title">🧑‍🏫 Giảng viên phụ trách</div><div className="card-num">{stats.teachers}</div></div>
        <div className="card"><div className="card-title">🎓 Tổng sinh viên</div><div className="card-num">{stats.totalStudents}</div></div>
      </section>

      <div className="toolbar-sub">
        <div className="left">
          <button className="chip" disabled={!anySelected} onClick={()=>bulkStatus("Đang hoạt động")}>Cập nhật: Đang hoạt động</button>
          <button className="chip" disabled={!anySelected} onClick={()=>bulkStatus("Tạm nghỉ")}>Cập nhật: Tạm nghỉ</button>
          <button className="chip" disabled={!anySelected} onClick={()=>bulkStatus("Kết thúc")}>Cập nhật: Kết thúc</button>
          <button className="chip" onClick={()=>alert("Nhập Excel/CSV")}>📥 Nhập danh sách</button>
          <button className="chip" onClick={()=>alert("Xuất CSV/Excel")}>📤 Xuất danh sách</button>
          <button className="chip danger" disabled={!anySelected} onClick={bulkDelete}>🗑 Xóa lớp</button>
        </div>
        <div className="right">{anySelected ? `${selected.size} lớp đã chọn` : ""}</div>
      </div>

      <div className="panel">
        <div className="table classes-table">
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
                <div className="section-title">Môn học & Lịch học</div>
                <div className="list small">
                  <div>Môn: Lập trình C# nâng cao</div>
                  <div>Thời khóa biểu: {formDay} – {formSlot} | Phòng {formRoom}</div>
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

      {modalOpen && (
        <div className="modal" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="title">{edit?"Chỉnh sửa lớp":"Tạo lớp mới"}</div>
              <button className="icon-btn" onClick={() => setModalOpen(false)}>✖</button>
            </div>
            <div className="modal-body grid2">
              <div className="form-col">
                <label className="label">Tên lớp</label>
                <input className="input" value={formName} onChange={(e)=>setFormName(e.target.value)} placeholder="Lập trình .NET" />
                <label className="label">Mã lớp</label>
                <input className="input" value={formCode} onChange={(e)=>setFormCode(e.target.value)} placeholder="SE1601" />
                <label className="label">Khóa học</label>
                <select className="input" value={formCohort} onChange={(e)=>setFormCohort(e.target.value)}>
                  <option>K19</option>
                  <option>K20</option>
                </select>
                <label className="label">Ngành học</label>
                <select className="input" value={formMajor} onChange={(e)=>setFormMajor(e.target.value)}>
                  <option>CNTT</option>
                  <option>Điện - Điện tử</option>
                </select>
                <label className="label">Giảng viên phụ trách</label>
                <select className="input" value={formTeacher} onChange={(e)=>setFormTeacher(e.target.value)}>
                  <option>Nguyễn Văn A</option>
                  <option>Trần Thị B</option>
                </select>
                <label className="label">Trạng thái</label>
                <select className="input" value={formStatus} onChange={(e)=>setFormStatus(e.target.value as any)}>
                  <option>Đang hoạt động</option>
                  <option>Tạm nghỉ</option>
                  <option>Kết thúc</option>
                </select>
              </div>
              <div className="form-col">
                <label className="label">Danh sách sinh viên (MSSV, cách nhau bởi dấu phẩy)</label>
                <textarea className="input" rows={5} value={formStudents} onChange={(e)=>setFormStudents(e.target.value)} placeholder="SE12345, SE12346"></textarea>
                <div className="section-title">Lịch học</div>
                <div className="grid-3">
                  <select className="input" value={formDay} onChange={(e)=>setFormDay(e.target.value)}>
                    <option>Thứ 2</option><option>Thứ 3</option><option>Thứ 4</option><option>Thứ 5</option><option>Thứ 6</option>
                  </select>
                  <select className="input" value={formSlot} onChange={(e)=>setFormSlot(e.target.value)}>
                    <option>Tiết 1-3</option><option>Tiết 3-5</option><option>Tiết 5-7</option>
                  </select>
                  <input className="input" placeholder="Phòng" value={formRoom} onChange={(e)=>setFormRoom(e.target.value)} />
                </div>
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

