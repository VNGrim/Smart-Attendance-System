"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { apiFetchJson } from "../../lib/authClient";
import { makeApiUrl } from "../../lib/apiBase";

interface AttendanceRecord {
  id: number;
  student_id: string;
  student_name: string;
  class_name: string;
  teacher_name: string;
  date: string;
  slot: number | null;
  attendance_code: string;
  status: 'attended' | 'absent' | 'late';
}

interface StudentInfo {
  student_id: string;
  full_name: string;
  course: string;
  classes: string[];
}

export default function LichSuPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [themeDark, setThemeDark] = useState(true);
  const studentId = (() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem("sas_user");
      if (!raw) return "";
      const u = JSON.parse(raw);
      if (u?.role === "student" && typeof u?.userId === "string") return u.userId;
      return "";
    } catch {
      return "";
    }
  })();

  useEffect(() => {
    fetchData();
    try {
      const saved = localStorage.getItem('sas_settings');
      if (saved) {
        const s = JSON.parse(saved);
        setThemeDark(s.themeDark ?? true);
        document.documentElement.classList.toggle('dark-theme', s.themeDark);
        document.documentElement.classList.toggle('light-theme', !s.themeDark);
      }
    } catch { }
    const handler = (e: any) => {
      const s = e.detail;
      if (!s) return;
      setThemeDark(s.themeDark);
      document.documentElement.classList.toggle('dark-theme', s.themeDark);
      document.documentElement.classList.toggle('light-theme', !s.themeDark);
    };
    window.addEventListener('sas_settings_changed', handler);

    return () => window.removeEventListener('sas_settings_changed', handler);
  }, []);

  const HISTORY_API = makeApiUrl('/api/lichsu_sv');
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load student basic info if needed
      if (!studentInfo) {
        const infoRes = await apiFetchJson<{ success: boolean; data?: any }>(makeApiUrl(`/api/thongbao/students/${studentId}`));
        if (infoRes && (infoRes as any).success) {
          setStudentInfo((infoRes as any).data ?? null);
        }
      }

      const params: Record<string, any> = {};
      if (dateFilter) params.date = dateFilter;
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter === 'present' ? 'present' : 'absent';
      }
      const res = await apiFetchJson<{ success: boolean; data: { items: any[]; page: number; pageSize: number; total: number } }>(`${HISTORY_API}/history`, { method: 'GET', headers: { 'Content-Type': 'application/json' }, params });

      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      const mapped: AttendanceRecord[] = items.map((it: any) => ({
        id: it.id,
        student_id: it.student_id,
        student_name: studentInfo?.full_name || 'Sinh viên',
        class_name: it.class_name || it.class_id || '',
        teacher_name: it.teacher_name || '',
        date: it.date,
        slot: it.slot ?? null,
        attendance_code: it.attendance_code || '',
        status: it.status === 'present' ? 'attended' : (it.status || 'absent'),
      }));
      setAttendanceRecords(mapped);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Refetch when filters change
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFilter]);

  const filtered = useMemo(() => {
    return attendanceRecords.filter(r => {
      const matchStatus = statusFilter === 'all' ? true : (statusFilter === 'present' ? r.status === 'attended' : r.status === 'absent');
      const matchDate = dateFilter ? r.date === dateFilter : true;
      return matchStatus && matchDate;
    });
  }, [attendanceRecords, statusFilter, dateFilter]);

  const totalSessions = attendanceRecords.length;
  const totalPresent = attendanceRecords.filter(r => r.status === 'attended').length;
  const totalAbsent = attendanceRecords.filter(r => r.status === 'absent').length;

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="side-header">
          <button className="collapse-btn" onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
            {collapsed ? '⮞' : '⮜'}
          </button>
          <div className="side-name">
            Chào mừng,<br />
            {studentInfo?.full_name || "Sinh viên"}
          </div>
        </div>
        <nav className="side-nav">
          <Link href="/tongquan_sv" className="side-link">🏠 {!collapsed && "Trang tổng quan"}</Link>
          <Link href="/thongbao_sv" className="side-link">🔔 {!collapsed && "Thông báo"}</Link>
          <Link href="/lichhoc_sv" className="side-link">📅 {!collapsed && "Lịch học"}</Link>
          <div className="side-link active">🕘 {!collapsed && "Lịch sử"}</div>
          <Link href="/caidat_sv" className="side-link">⚙️ {!collapsed && "Cài đặt"}</Link>
        </nav>
      </aside>
      <header className="topbar">
        <div className="welcome">
          <div className="hello">Xin chào, {studentInfo?.full_name || "Sinh viên"} 👋</div>
          <div className="date">Hôm nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
        </div>
        <div className="controls">
          <button className="qr-btn" onClick={() => {
            if (confirm('Bạn có chắc muốn đăng xuất?')) {
              localStorage.removeItem('sas_user');
              window.location.href = '/login';
            }
          }}>🚪 Đăng xuất</button>
        </div>
      </header>
      <main className={`main ${themeDark ? 'dark-theme' : 'light-theme'}`}>
        {children}
      </main>

    </div>
  );

  if (loading) {
    return (
      <Shell>
        <div className="container">
          <div className="card" style={{ textAlign: 'center' }}>Đang tải lịch sử điểm danh...</div>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="container">
          <div className="card" style={{ textAlign: 'center', color: 'red' }}>{error}</div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="container">
        {/* Summary cards */}
        <div className="summary">
          <div className="card kpi"><div className="label">Tổng buổi</div><div className="value">{totalSessions}</div></div>
          <div className="card kpi"><div className="label">Có mặt</div><div className="value" style={{ color: 'var(--accent-green)' }}>{totalPresent}</div></div>
          <div className="card kpi"><div className="label">Vắng</div><div className="value" style={{ color: 'var(--accent-red)' }}>{totalAbsent}</div></div>
        </div>

        {/* Filters */}
        <div className="filters">
          <input type="date" className="select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="present">Có mặt</option>
            <option value="absent">Vắng</option>
          </select>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>MSSV</th>
                <th>Lớp</th>
                <th>Giảng viên</th>
                <th>Ngày</th>
                <th>Mã</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id}>
                  <td>{record.student_name} - {record.student_id}</td>
                  <td>{record.class_name}</td>
                  <td>{record.teacher_name}</td>
                  <td>{record.date} - slot {record.slot}</td>
                  <td>{record.attendance_code}</td>
                  <td>
                    <span className={`badge ${record.status === 'attended' ? 'present' : 'absent'}`}>
                      {record.status === 'attended' ? 'Present' : 'Absent'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
