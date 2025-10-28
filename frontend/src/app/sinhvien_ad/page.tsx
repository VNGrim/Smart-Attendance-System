"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Student = {
  id: string;
  mssv: string;
  name: string;
  className: string;
  cohort: string;
  major: string;
  advisor: string;
  status: "Hoạt động" | "Bị khóa";
  email?: string;
  phone?: string;
  avatar?: string;
};

export default function AdminStudentsPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("Tất cả lớp");
  const [filterCohort, setFilterCohort] = useState("Tất cả khóa");
  const [filterStatus, setFilterStatus] = useState("Tất cả trạng thái");
  const [list, setList] = useState<Student[]>([]);
  const [sortKey, setSortKey] = useState<keyof Student>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<Student | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState<Student | null>(null);

  useEffect(() => {
    setList([
      { id: "1", mssv: "SE12345", name: "Nguyễn Minh Hào", className: "SE1601", cohort: "K19", major: "Kỹ thuật phần mềm", advisor: "Trần Văn A", status: "Hoạt động", email: "hao@example.com", phone: "0901" },
      { id: "2", mssv: "SE12346", name: "Trần Thị Huyền", className: "SE1601", cohort: "K19", major: "Kỹ thuật phần mềm", advisor: "Trần Văn A", status: "Bị khóa", email: "huyen@example.com", phone: "0902" },
      { id: "3", mssv: "SE12347", name: "Phạm Anh Tuấn", className: "SE1602", cohort: "K19", major: "Kỹ thuật phần mềm", advisor: "Lê Thị B", status: "Hoạt động", email: "tuan@example.com", phone: "0903" },
    ]);
    try {
      const saved = localStorage.getItem("sas_settings");
      if (saved) {
        const s = JSON.parse(saved);
        document.documentElement.style.colorScheme = s.themeDark ? "dark" : "light";
      }
    } catch {}
  }, []);

  const toggleSort = (key: keyof Student) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    let data = list.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) || s.mssv.toLowerCase().includes(search.toLowerCase())
    );
    if (filterClass !== "Tất cả lớp") data = data.filter((s) => s.className === filterClass);
    if (filterCohort !== "Tất cả khóa") data = data.filter((s) => s.cohort === filterCohort);
    if (filterStatus !== "Tất cả trạng thái") data = data.filter((s) => s.status === filterStatus);
    data.sort((a: any, b: any) => {
      const va = (a[sortKey] || "").toString().toLowerCase();
      const vb = (b[sortKey] || "").toString().toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return data;
  }, [list, search, filterClass, filterCohort, filterStatus, sortKey, sortAsc]);

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

  const bulkDelete = () => {
    if (!confirm("Xóa các sinh viên đã chọn?")) return;
    setList((prev) => prev.filter((s) => !selected.has(s.id)));
    setSelected(new Set());
  };

  const onOpenCreate = () => { setEdit(null); setModalOpen(true); };
  const onOpenEdit = (s: Student) => { setEdit(s); setModalOpen(true); };

  const [formMSSV, setFormMSSV] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("sinhvienfpt");
  const [passwordEditable, setPasswordEditable] = useState(false);
  const [formClass, setFormClass] = useState("SE1601");
  const [formCohort, setFormCohort] = useState("K19");
  const [formMajor, setFormMajor] = useState("Kỹ thuật phần mềm");
  const [formAdvisor, setFormAdvisor] = useState("Trần Văn A");

  useEffect(() => {
    if (edit) {
      setFormMSSV(edit.mssv);
      setFormName(edit.name);
      setFormEmail(edit.email || "");
      setFormClass(edit.className);
      setFormCohort(edit.cohort);
      setFormMajor(edit.major);
      setFormAdvisor(edit.advisor);
      setFormPassword("********");
      setPasswordEditable(false);
    } else {
      setFormMSSV("");
      setFormName("");
      setFormEmail("");
      setFormPassword("sinhvienfpt");
      setPasswordEditable(false);
      setFormClass("SE1601");
      setFormCohort("K19");
      setFormMajor("Kỹ thuật phần mềm");
      setFormAdvisor("Trần Văn A");
    }
  }, [modalOpen, edit]);

  const onSubmit = () => {
    if (edit) {
      setList((prev) => prev.map((s) => (s.id === edit.id ? { ...s, mssv: formMSSV, name: formName, className: formClass, cohort: formCohort, major: formMajor, advisor: formAdvisor, status: edit.status, email: formEmail } : s)));
    } else {
      const id = Math.random().toString(36).slice(2, 9);
      setList((prev) => prev.concat({ id, mssv: formMSSV || `SV${Date.now().toString().slice(-6)}`, name: formName, className: formClass, cohort: formCohort, major: formMajor, advisor: formAdvisor, status: "Hoạt động", email: formEmail }));
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
          <Link href="/thongbao_ad" className="side-link" title="Thông báo">📢 {!collapsed && "Thông báo"}</Link>
          <Link href="/sinhvien_ad" className="side-link active" title="Sinh viên">👨‍🎓 {!collapsed && "Sinh viên"}</Link>
          <Link href="/giangvien_ad" className="side-link" title="Giảng viên">👩‍🏫 {!collapsed && "Giảng viên"}</Link>
          <Link href="/lophoc_ad" className="side-link" title="Lớp học">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/lichhoc_ad" className="side-link" title="Lịch học">📅 {!collapsed && "Lịch học"}</Link>
          <Link href="/taikhoan_ad" className="side-link" title="Tài khoản">🔑 {!collapsed && "Tài khoản"}</Link>
          <Link href="/caidat_ad" className="side-link" title="Cấu hình">⚙️ {!collapsed && "Cấu hình"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="top-left">
          <div className="page-title">Quản lý Sinh viên</div>
        </div>
        <div className="controls">
          <div className="search">
            <i className="fas fa-search" />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Tìm tên, MSSV" />
          </div>
          <div className="filter-line">
            <select className="input" value={filterClass} onChange={(e)=>setFilterClass(e.target.value)}>
              <option>Tất cả lớp</option>
              <option>SE1601</option>
              <option>SE1602</option>
            </select>
            <select className="input" value={filterCohort} onChange={(e)=>setFilterCohort(e.target.value)}>
              <option>Tất cả khóa</option>
              <option>K19</option>
              <option>K20</option>
            </select>
            <select className="input" value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)}>
              <option>Tất cả trạng thái</option>
              <option>Hoạt động</option>
              <option>Bị khóa</option>
            </select>
          </div>
          <button className="btn-green" onClick={onOpenCreate}>+ Thêm sinh viên</button>
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

  const selectedCount = selected.size;
  const anySelected = selectedCount > 0;

  return (
    <Shell>
      <div className="toolbar-sub">
        <div className="left">
          <button className="chip" onClick={()=>alert("Nhập CSV/Excel")}>📥 Nhập danh sách</button>
          <button className="chip" onClick={()=>alert("Xuất CSV/Excel")}>📤 Xuất danh sách</button>
          <button className="chip danger" disabled={!anySelected} onClick={bulkDelete}>🗑 Xóa hàng loạt</button>
        </div>
        <div className="right">{anySelected ? `${selectedCount} đã chọn` : ""}</div>
      </div>

      <div className="panel">
        <div className="table students-table">
          <div className="thead">
            <div><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /></div>
            <div className="th" onClick={()=>toggleSort("mssv")}>MSSV</div>
            <div className="th" onClick={()=>toggleSort("name")}>Họ tên</div>
            <div className="th" onClick={()=>toggleSort("className")}>Lớp</div>
            <div className="th" onClick={()=>toggleSort("cohort")}>Khóa</div>
            <div className="th" onClick={()=>toggleSort("major")}>Ngành</div>
            <div className="th" onClick={()=>toggleSort("advisor")}>Giảng viên phụ trách</div>
            <div className="th" onClick={()=>toggleSort("status")}>Trạng thái</div>
            <div>Thao tác</div>
          </div>
          <div className="tbody">
            {filtered.map((s) => (
              <div className="trow" key={s.id} onClick={() => setDrawer(s)}>
                <div><input type="checkbox" checked={selected.has(s.id)} onChange={(e)=>{e.stopPropagation(); toggleSelect(s.id);}} /></div>
                <div>{s.mssv}</div>
                <div>{s.name}</div>
                <div>{s.className}</div>
                <div>{s.cohort}</div>
                <div>{s.major}</div>
                <div>{s.advisor}</div>
                <div><span className={`status ${s.status}`.replace(/\s/g,"-")}>{s.status}</span></div>
                <div className="actions">
                  <button className="icon-btn" title="Xem" onClick={(e)=>{e.stopPropagation(); setDrawer(s);}}>👁</button>
                  <button className="icon-btn" title="Sửa" onClick={(e)=>{e.stopPropagation(); onOpenEdit(s);}}>✏️</button>
                  <button className="icon-btn" title="Xóa" onClick={(e)=>{e.stopPropagation(); if(confirm("Xóa sinh viên?")) setList(prev=>prev.filter(x=>x.id!==s.id));}}>🗑</button>
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
              <div className="title">{drawer.name}</div>
              <button className="icon-btn" onClick={() => setDrawer(null)}>✖</button>
            </div>
            <div className="drawer-body grid2">
              <div className="profile">
                <div className="avatar-lg">{drawer.name.split(" ").map(w=>w[0]).slice(-2).join("")}</div>
                <div className="kv"><span className="k">MSSV</span><span className="v">{drawer.mssv}</span></div>
                <div className="kv"><span className="k">Lớp</span><span className="v">{drawer.className}</span></div>
                <div className="kv"><span className="k">Khóa</span><span className="v">{drawer.cohort}</span></div>
                <div className="kv"><span className="k">Ngành</span><span className="v">{drawer.major}</span></div>
                <div className="kv"><span className="k">Cố vấn</span><span className="v">{drawer.advisor}</span></div>
                <div className="kv"><span className="k">Email</span><span className="v">{drawer.email||"--"}</span></div>
                <div className="kv"><span className="k">Điện thoại</span><span className="v">{drawer.phone||"--"}</span></div>
                <div className="kv"><span className="k">Trạng thái</span><span className="v"><span className={`status ${drawer.status}`.replace(/\s/g,"-")}>{drawer.status}</span></span></div>
                <div className="actions-row">
                  <button className="qr-btn" onClick={()=>{ setDrawer(null); onOpenEdit(drawer); }}>✏️ Chỉnh sửa</button>
                  <button className="qr-btn" onClick={()=>setList(prev=>prev.map(x=>x.id===drawer.id?{...x,status:x.status==="Hoạt động"?"Bị khóa":"Hoạt động"}:x))}>{drawer.status==="Hoạt động"?"🔒 Khóa":"✅ Mở khóa"}</button>
                  <button className="qr-btn" onClick={()=>alert("Chuyển lớp")}>🔁 Chuyển lớp</button>
                  <button className="qr-btn" onClick={()=>{ if(confirm("Xóa sinh viên?")){ setList(prev=>prev.filter(x=>x.id!==drawer.id)); setDrawer(null);} }}>🗑 Xóa</button>
                </div>
              </div>
              <div className="study">
                <div className="section-title">Lớp đang tham gia</div>
                <ul className="list">
                  <li>{drawer.className} - Toán rời rạc</li>
                  <li>{drawer.className} - Cấu trúc dữ liệu</li>
                </ul>
                <div className="section-title">Giảng viên phụ trách</div>
                <div className="pill">{drawer.advisor}</div>
                <div className="section-title">Môn học & Điểm tổng quan</div>
                <div className="chips">
                  <span className="pill">CTDL 8.2</span>
                  <span className="pill">Cơ sở dữ liệu 7.8</span>
                  <span className="pill">Lập trình Web 8.8</span>
                </div>
                <div className="section-title">Lịch học sắp tới</div>
                <div className="list small">
                  <div>Thứ 2 08:00 - Lập trình Web - P201</div>
                  <div>Thứ 4 10:00 - CSDL - P304</div>
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
              <div className="title">{edit?"Chỉnh sửa sinh viên":"Thêm sinh viên"}</div>
              <button className="icon-btn" onClick={() => setModalOpen(false)}>✖</button>
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
                    <input className="input" value={formMSSV} onChange={(e)=>setFormMSSV(e.target.value)} placeholder="SE12345" />
                    <label className="label">Họ tên</label>
                    <input className="input" value={formName} onChange={(e)=>setFormName(e.target.value)} placeholder="Nguyễn Văn A" />
                    <label className="label">Email</label>
                    <input className="input" value={formEmail} onChange={(e)=>setFormEmail(e.target.value)} placeholder="email@domain.com" />
                    <div className="field-label-row">
                      <label className="label">Mật khẩu</label>
                      <span className="field-hint">Mặc định: "sinhvienfpt"</span>
                    </div>
                    <div className="password-row">
                      <input
                        className="input"
                        type={passwordEditable ? "text" : "password"}
                        value={formPassword}
                        onChange={(e)=>setFormPassword(e.target.value)}
                        disabled={!passwordEditable}
                        placeholder="sinhvienfpt"
                      />
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={()=>setPasswordEditable((prev)=>!prev)}
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
                        <select className="input" value={formClass} onChange={(e)=>setFormClass(e.target.value)}>
                          <option>SE1601</option>
                          <option>SE1602</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Khóa</label>
                        <select className="input" value={formCohort} onChange={(e)=>setFormCohort(e.target.value)}>
                          <option>K19</option>
                          <option>K20</option>
                        </select>
                      </div>
                    </div>
                    <label className="label">Ngành</label>
                    <select className="input" value={formMajor} onChange={(e)=>setFormMajor(e.target.value)}>
                      <option>Kỹ thuật phần mềm</option>
                      <option>Hệ thống thông tin</option>
                    </select>
                    <label className="label">Giảng viên phụ trách</label>
                    <select className="input" value={formAdvisor} onChange={(e)=>setFormAdvisor(e.target.value)}>
                      <option>Trần Văn A</option>
                      <option>Lê Thị B</option>
                    </select>
                  </div>
                </div>
                <div className="form-section soft">
                  <div className="section-head">
                    <div className="section-title">Tóm tắt nhanh</div>
                    <div className="section-subtitle">Kiểm tra lại các thiết lập trước khi lưu</div>
                  </div>
                  <div className="summary-grid">
                    <div className="summary-pill">✅ Trạng thái mặc định: Hoạt động</div>
                    <div className="summary-pill">👨‍🏫 Giảng viên: {formAdvisor}</div>
                    <div className="summary-pill">🎓 Khóa: {formCohort}</div>
                  </div>
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

