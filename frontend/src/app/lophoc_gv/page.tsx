"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ClassInfo = { id: string; code: string; subject: string; size: number; schedule: string; room: string };
type Student = { id: string; name: string; email: string; attendance: number; note?: string };
type Material = { name: string; size: string; date: string };
type Grade = { id: string; name: string; attendance: number; assignment: number; midterm: number; final: number };

type TabKey = "students" | "materials" | "grades";

type SasSettings = { themeDark?: boolean };
type SettingsEventDetail = { themeDark: boolean };

const SETTINGS_CHANGED_EVENT = "sas_settings_changed";

export default function LecturerClassesPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(true);
  const [notifCount] = useState(2);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [activeClass, setActiveClass] = useState<ClassInfo | null>(null);
  const [tab, setTab] = useState<TabKey>("students");

  const [students, setStudents] = useState<Student[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [teacher, setTeacher] = useState<{ teacher_id: string; full_name: string } | null>(null);

  const teacherId = (() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem("sas_user");
      if (!raw) return "";
      const u = JSON.parse(raw);
      if (u?.role === "teacher" && typeof u?.userId === "string") return u.userId;
      return "";
    } catch { return ""; }
  })();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    const fetchTeacher = async () => {
      if (!teacherId) return;
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
        const res = await fetch(`${base}/api/lichday/teachers/${teacherId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json?.success && json?.data) setTeacher(json.data);
      } catch {}
    };
    fetchTeacher();
  }, [teacherId]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8080/api/lop/classes', {
        credentials: 'include'
      });
      if (!res.ok) {
        console.error('Failed to fetch classes');
        return;
      }
      const json = await res.json();
      if (json.success && json.data) {
        setClasses(json.data);
        if (json.data.length > 0) {
          setActiveClass(json.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sas_settings");
      if (saved) {
        const settings: SasSettings = JSON.parse(saved);
        const themeDark = settings.themeDark ?? true;
        setDark(themeDark);
        document.documentElement.classList.toggle("dark-theme", themeDark);
        document.documentElement.classList.toggle("light-theme", !themeDark);
      }
    } catch {}

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SettingsEventDetail>).detail;
      if (!detail) return;
      setDark(detail.themeDark);
      document.documentElement.classList.toggle("dark-theme", detail.themeDark);
      document.documentElement.classList.toggle("light-theme", !detail.themeDark);
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!activeClass) return;
    fetchStudents();
    fetchMaterials();
    fetchGrades();
  }, [activeClass]);

  const fetchStudents = async () => {
    if (!activeClass) return;
    try {
      const res = await fetch(`http://localhost:8080/api/lop/classes/${activeClass.id}/students`, {
        credentials: 'include'
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setStudents(json.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchMaterials = async () => {
    if (!activeClass) return;
    try {
      const res = await fetch(`http://localhost:8080/api/lop/classes/${activeClass.id}/materials`, {
        credentials: 'include'
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setMaterials(json.data);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const fetchGrades = async () => {
    if (!activeClass) return;
    try {
      const res = await fetch(`http://localhost:8080/api/lop/classes/${activeClass.id}/grades`, {
        credentials: 'include'
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setGrades(json.data);
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    try {
      const saved = localStorage.getItem("sas_settings");
      const prev = saved ? JSON.parse(saved) : {};
      const merged = { ...prev, themeDark: next };
      localStorage.setItem("sas_settings", JSON.stringify(merged));
      document.documentElement.style.colorScheme = next ? "dark" : "light";
      window.dispatchEvent(new CustomEvent<SettingsEventDetail>(SETTINGS_CHANGED_EVENT, { detail: { themeDark: next } }));
    } catch {}
  };

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
  }, [students, search]);

  const exportStudentsCsv = () => {
    if (!activeClass) return;
    const header = ["MaSV", "HoTen", "Email", "DiemDanh(%)", "GhiChu"];
    const rows = filteredStudents.map((s) => [s.id, s.name, s.email, String(s.attendance), s.note || ""]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeClass.code}-students.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className={`layout ${collapsed ? "collapsed" : ""} ${dark ? '' : 'light-theme'}`}>
      <aside className="sidebar">
        <div className="side-header">
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Mở rộng" : "Thu gọn"}>
            {collapsed ? "⮞" : "⮜"}
          </button>
          {!collapsed && <div className="side-name">Smart Attendance</div>}
        </div>
        <nav className="side-nav">
          <Link href="/tongquan_gv" className="side-link">🏠 {!collapsed && "Dashboard"}</Link>
          <Link href="/thongbao_gv" className="side-link">📢 {!collapsed && "Thông báo"}</Link>
          <Link href="/lichday_gv" className="side-link">📅 {!collapsed && "Lịch giảng dạy"}</Link>
          <Link href="/lophoc_gv" className="side-link active">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/diemdanh_gv" className="side-link">🧍‍♂️ {!collapsed && "Điểm danh"}</Link>
          <Link href="/caidat_gv" className="side-link">⚙️ {!collapsed && "Cài đặt"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="page-title">Lớp học</div>
        <div className="controls">
          <button className="qr-btn" onClick={async ()=>{ 
            if (confirm('Bạn có chắc muốn đăng xuất?')) {
              try { await fetch('http://localhost:8080/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
              try { localStorage.removeItem('sas_user'); } catch {}
              window.location.href = '/login';
            }
          }}>🚪 Đăng xuất</button>
        </div>
      </header>

      <main className="main">{children}</main>
    </div>
  );

  return (
    <Shell>
      <div className="two-col">
        <div className="left-list">
          <div className="list-title">Lớp đang dạy</div>
          <div className="class-list">
            {classes.map((c) => (
              <div key={c.id} className={`class-item ${activeClass?.id === c.id ? "active" : ""}`} onClick={() => setActiveClass(c)}>
                <div className="c-title">{c.code} – {c.subject}</div>
                <div className="c-sub">Sĩ số: {c.size}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="right-detail">
          {activeClass && (
            <>
              <div className="class-info">
                <div className="title">{activeClass.code} – {activeClass.subject}</div>
                <div className="meta">Giảng viên: {teacher?.full_name || ""} - Lớp: {activeClass.id}</div>
              </div>

              <div className="tabs">
                <button className={`tab ${tab==='students'?'active':''}`} onClick={()=>setTab('students')}>👨‍🎓 Sinh viên</button>
                <button className={`tab ${tab==='materials'?'active':''}`} onClick={()=>setTab('materials')}>📄 Tài liệu</button>
                <button className={`tab ${tab==='grades'?'active':''}`} onClick={()=>setTab('grades')}>🧾 Bảng điểm</button>
              </div>

              {tab === 'students' && (
                <div className="div">
                  <div className="row-actions">
                    <input className="input" placeholder="Tìm kiếm sinh viên" value={search} onChange={(e)=>setSearch(e.target.value)} />
                    <button className="btn-outline" onClick={()=>alert('Lịch sử điểm danh (demo)')}>Lịch sử điểm danh</button>
                    <button className="btn-outline" onClick={exportStudentsCsv}>📤 Xuất CSV</button>
                    
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Mã SV</th>
                          <th>Họ tên</th>
                          <th>Email</th>
                          <th>Điểm danh</th>
                          <th>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((s) => (
                          <tr key={s.id}>
                            <td>{s.id}</td>
                            <td>{s.name}</td>
                            <td>{s.email}</td>
                            <td>{s.attendance}%</td>
                            <td>
                              <input className="input" value={s.note||''} onChange={(e)=>{ const v=e.target.value; setStudents(prev=> prev.map(x=> x.id===s.id?{...x, note:v}:x)); }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'materials' && (
                <div className="panel">
                  <div className="row-actions">
                    <div className="label-strong">Tài liệu môn học</div>
                    <input className="input" type="file" onChange={(e)=>{ const f=e.target.files?.[0]; if(!f) return; setMaterials(prev=>[...prev,{ name:f.name, size:`${(f.size/1024).toFixed(0)}KB`, date: new Date().toLocaleDateString('vi-VN')}]); }} />
                  </div>
                  <div className="list">
                    {materials.map((m,i)=> (
                      <div key={i} className="mat-item">
                        <div>
                          <div className="mat-title">{m.name}</div>
                          <div className="mat-sub">{m.size} • {m.date}</div>
                        </div>
                        <button className="btn-outline" onClick={()=>alert('Tải xuống (demo)')}>Tải xuống</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'grades' && (
                <div className="panel">
                  <div className="row-actions end">
                    <button className="btn-success" onClick={()=>alert('Đã lưu điểm (demo)')}>Lưu thay đổi</button>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Mã SV</th>
                          <th>Họ tên</th>
                          <th>Chuyên cần</th>
                          <th>Bài tập</th>
                          <th>Giữa kỳ</th>
                          <th>Cuối kỳ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grades.map((g)=> (
                          <tr key={g.id}>
                            <td>{g.id}</td>
                            <td>{g.name}</td>
                            <td><input className="input" type="number" min={0} max={10} step={0.5} value={g.attendance} onChange={(e)=>{ const v=parseFloat(e.target.value||'0'); setGrades(prev=> prev.map(x=> x.id===g.id?{...x, attendance:v}:x)); }} /></td>
                            <td><input className="input" type="number" min={0} max={10} step={0.5} value={g.assignment} onChange={(e)=>{ const v=parseFloat(e.target.value||'0'); setGrades(prev=> prev.map(x=> x.id===g.id?{...x, assignment:v}:x)); }} /></td>
                            <td><input className="input" type="number" min={0} max={10} step={0.5} value={g.midterm} onChange={(e)=>{ const v=parseFloat(e.target.value||'0'); setGrades(prev=> prev.map(x=> x.id===g.id?{...x, midterm:v}:x)); }} /></td>
                            <td><input className="input" type="number" min={0} max={10} step={0.5} value={g.final} onChange={(e)=>{ const v=parseFloat(e.target.value||'0'); setGrades(prev=> prev.map(x=> x.id===g.id?{...x, final:v}:x)); }} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}

