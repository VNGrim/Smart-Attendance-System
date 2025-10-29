"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AddLecturerModal from "./AddLecturerModal";
import { Lecturer, mapBackendLecturer } from "./lecturerUtils";

export default function AdminLecturersPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [list, setList] = useState<Lecturer[]>([]);
  const [sortKey, setSortKey] = useState<keyof Lecturer>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<Lecturer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState<Lecturer | null>(null);
  const [classesByLecturer, setClassesByLecturer] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      try {
        const saved = localStorage.getItem("sas_settings");
        if (saved) {
          const s = JSON.parse(saved);
          document.documentElement.style.colorScheme = s.themeDark ? "dark" : "light";
        }
      } catch {}

      try {
        const resp = await fetch("http://localhost:8080/api/admin/lecturers", {
          credentials: "include",
          signal: controller.signal,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (cancelled) return;
        const lecturers: Lecturer[] = Array.isArray(data?.lecturers)
          ? data.lecturers.map((lec: any) => mapBackendLecturer(lec))
          : [];
        setList(lecturers);
        const classMap: Record<string, string[]> = {};
        lecturers.forEach((lec) => {
          if (lec.classList?.length) classMap[lec.id] = lec.classList;
        });
        setClassesByLecturer(classMap);
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
        console.error("fetch lecturers error", err);
      }
    };

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const toggleSort = (key: keyof Lecturer) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    let data = list.filter((s) =>
      (s.status === "Đang dạy" || s.status === "Tạm nghỉ") &&
      (s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()) || (s.email||"").toLowerCase().includes(search.toLowerCase()))
    );
    data.sort((a: any, b: any) => {
      const va = (a[sortKey] || "").toString().toLowerCase();
      const vb = (b[sortKey] || "").toString().toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return data;
  }, [list, search, sortKey, sortAsc]);

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
  const handleSaved = useCallback((lecturer: Lecturer) => {
    setList((prev) => {
      const exists = prev.some((s) => s.id === lecturer.id);
      if (exists) {
        return prev.map((s) => (s.id === lecturer.id ? lecturer : s));
      }
      return [lecturer, ...prev];
    });
    if (lecturer.classList) {
      setClassesByLecturer((prev) => ({ ...prev, [lecturer.id]: lecturer.classList ?? [] }));
    }
  }, []);

  const stats = useMemo(() => {
    const total = list.length;
    const teaching = list.filter((x) => x.status === "Đang dạy").length;
    const resting = list.filter((x) => x.status === "Tạm nghỉ").length;
    const totalClasses = list.reduce((a, b) => a + (classesByLecturer[b.id]?.length ?? b.classes ?? 0), 0);
    return { total, teaching, resting, totalClasses };
  }, [list, classesByLecturer]);

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
          <Link href="/giangvien_ad" className="side-link active" title="Giảng viên">👩‍🏫 {!collapsed && "Giảng viên"}</Link>
          <Link href="/lophoc_ad" className="side-link" title="Lớp học">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/lichhoc_ad" className="side-link" title="Lịch học">📅 {!collapsed && "Lịch học"}</Link>
          <Link href="/taikhoan_ad" className="side-link" title="Tài khoản">🔑 {!collapsed && "Tài khoản"}</Link>
          <Link href="/caidat_ad" className="side-link" title="Cấu hình">⚙️ {!collapsed && "Cấu hình"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="top-left">
          <div className="page-title">Quản lý Giảng viên</div>
        </div>
        <div className="controls">
          <div className="search">
            <i className="fas fa-search" />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Tìm tên, MSGV" />
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
        <div className="card"><div className="card-title">👨‍🏫 Tổng số</div><div className="card-num">{stats.total}</div></div>
        <div className="card"><div className="card-title">🏫 Đang dạy</div><div className="card-num">{stats.teaching}</div></div>
        <div className="card"><div className="card-title">💤 Tạm nghỉ</div><div className="card-num">{stats.resting}</div></div>
        <div className="card"><div className="card-title">🔁 Tổng lớp</div><div className="card-num">{stats.totalClasses}</div></div>
      </section>

      <div className="toolbar-sub">
        <div className="left">
          <button className="chip solid" onClick={onOpenCreate}>
            <span className="chip-icon">➕</span>
            <span className="chip-title">Thêm giảng viên</span>
            <span className="chip-sub">Tạo hồ sơ mới</span>
          </button>
          <button className="chip soft" onClick={()=>alert("Nhập Excel")}>
            <span className="chip-icon">📥</span>
            <span className="chip-title">Nhập danh sách</span>
            <span className="chip-sub">Hỗ trợ Excel, CSV</span>
          </button>
          <button className="chip outline" onClick={()=>alert("Xuất CSV/Excel")}>
            <span className="chip-icon">📤</span>
            <span className="chip-title">Xuất danh sách</span>
            <span className="chip-sub">Tải CSV nhanh</span>
          </button>
        </div>
        <div className="right">{anySelected ? `${selected.size} đã chọn` : ""}</div>
      </div>

      <div className="panel">
        <div className="table lecturers-table">
          <div className="thead">
            <div><input type="checkbox" checked={anySelected && filtered.every(s=>selected.has(s.id))} onChange={() => { if (anySelected && filtered.every(s=>selected.has(s.id))) setSelected(new Set()); else setSelected(new Set(filtered.map(s=>s.id))); }} /></div>
            <div className="th" onClick={()=>toggleSort("code")}>Mã GV</div>
            <div className="th" onClick={()=>toggleSort("name")}>Họ tên</div>
            <div className="th" onClick={()=>toggleSort("email")}>Email</div>
            <div className="th" onClick={()=>toggleSort("classes")}>Số lớp</div>
            <div className="th" onClick={()=>toggleSort("status")}>Trạng thái</div>
            <div>Thao tác</div>
          </div>
          <div className="tbody">
            {filtered.map((s) => {
              const classCount = classesByLecturer[s.id]?.length ?? s.classes ?? 0;
              return (
                <div className="trow" key={s.id} onClick={() => setDrawer(s)}>
                  <div><input type="checkbox" checked={selected.has(s.id)} onChange={(e)=>{e.stopPropagation(); toggleSelect(s.id);}} /></div>
                  <div>{s.code}</div>
                  <div>{s.name}</div>
                  <div>{s.email || "--"}</div>
                  <div>{classCount}</div>
                  <div><span className={`status ${s.status}`.replace(/\s/g,"-")}>{s.status}</span></div>
                  <div className="actions">
                    <button className="icon-btn" title="Xem" onClick={(e)=>{e.stopPropagation(); setDrawer(s);}}>👁</button>
                    <button className="icon-btn" title="Sửa" onClick={(e)=>{e.stopPropagation(); onOpenEdit(s);}}>✏️</button>
                    <button className="icon-btn" title="Xóa" onClick={(e)=>{e.stopPropagation(); if(confirm("Xóa giảng viên?")) setList(prev=>prev.filter(x=>x.id!==s.id));}}>🗑</button>
                  </div>
                </div>
              );
            })}
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
                <div className="section-title">Mã môn phụ trách</div>
                <div className="pill">{drawer.dept}</div>
                <div className="section-title">Số lớp đang phụ trách</div>
                <div className="pill">{classesByLecturer[drawer.id]?.length ?? 0} lớp</div>
                <div className="section-title">Lớp phụ trách</div>
                <div className="chips">
                  {(classesByLecturer[drawer.id] || []).length > 0 ? (
                    (classesByLecturer[drawer.id] || []).map((cls) => (
                      <span className="pill" key={cls}>{cls}</span>
                    ))
                  ) : (
                    <span className="pill muted">Chưa gán lớp</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddLecturerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        lecturer={edit}
        onSaved={handleSaved}
      />
    </Shell>
  );
}

