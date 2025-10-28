"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AddStudentModal from "./AddStudentModal";
import { Student, StudentOptions, mapBackendStudent } from "./studentUtils";

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
  const [options, setOptions] = useState<StudentOptions>({
    classes: [],
    cohorts: [],
    majors: [],
    advisors: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (filterClass && filterClass !== "Tất cả lớp") params.set("class", filterClass);
        if (filterCohort && filterCohort !== "Tất cả khóa") params.set("cohort", filterCohort);
        if (filterStatus && filterStatus !== "Tất cả trạng thái") params.set("status", filterStatus);

        const resp = await fetch(`http://localhost:8080/api/admin/students${params.toString() ? `?${params.toString()}` : ""}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!isMounted) return;
        const students = Array.isArray(data?.students)
          ? (data.students as any[]).map(mapBackendStudent)
          : [];
        setList(students);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("fetch students error", err);
        if (isMounted) setError("Không thể tải danh sách sinh viên. Vui lòng thử lại.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStudents();

    try {
      const saved = localStorage.getItem("sas_settings");
      if (saved) {
        const s = JSON.parse(saved);
        document.documentElement.style.colorScheme = s.themeDark ? "dark" : "light";
      }
    } catch {}

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [search, filterClass, filterCohort, filterStatus]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const resp = await fetch("http://localhost:8080/api/admin/students/options", {
          credentials: "include",
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const nextOptions = {
          classes: Array.isArray(data?.data?.classes) ? data.data.classes : [],
          cohorts: Array.isArray(data?.data?.cohorts) ? data.data.cohorts : [],
          majors: Array.isArray(data?.data?.majors) ? data.data.majors : [],
          advisors: Array.isArray(data?.data?.advisors) ? data.data.advisors : [],
        };
        setOptions(nextOptions);
      } catch (err) {
        console.error("fetch student options error", err);
      }
    };
    fetchOptions();
  }, []);

  const toggleSort = (key: keyof Student) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    const data = [...list];
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
          <button className="btn-green" onClick={onAddStudent}>+ Thêm sinh viên</button>
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

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEdit(null);
  }, []);

  const onAddStudent = useCallback(() => {
    setEdit(null);
    setModalOpen(true);
  }, []);

  const onOpenEdit = useCallback((student: Student) => {
    setDrawer(null);
    setEdit(student);
    setModalOpen(true);
  }, []);
  const handleStudentCreated = useCallback((student: Student) => {
    setList((prev) => {
      const withoutDup = prev.filter((s) => s.id !== student.id);
      return [student, ...withoutDup];
    });
    closeModal();
    setSearch("");
    setFilterClass("Tất cả lớp");
    setFilterCohort("Tất cả khóa");
    setFilterStatus("Tất cả trạng thái");
  }, [closeModal]);

  return (
    <Shell>
      <div className="toolbar-sub">
        <div className="left">
          <button className="chip" onClick={onAddStudent}>➕ Thêm sinh viên</button>
          <button className="chip" onClick={()=>alert("Nhập CSV/Excel")}>📥 Nhập danh sách</button>
          <button className="chip" onClick={()=>alert("Xuất CSV/Excel")}>📤 Xuất danh sách</button>
          <button className="chip danger" disabled={!anySelected} onClick={bulkDelete}>🗑 Xóa hàng loạt</button>
        </div>
        <div className="right">
          {loading && <span>Đang tải...</span>}
          {!loading && error && <span className="error-text">{error}</span>}
          {!loading && !error && anySelected ? `${selectedCount} đã chọn` : ""}
        </div>
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

      <AddStudentModal
        open={modalOpen}
        onClose={closeModal}
        options={options}
        student={edit}
        onSaved={handleStudentCreated}
      />
    </Shell>
  );
}

