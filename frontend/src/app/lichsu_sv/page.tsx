"use client";

import Link from "next/link";
import QRButton from "@/app/components/QRButton";
import { useState, useEffect, useMemo } from "react";

interface AttendanceRecord {
  id: number;
  student_id: string;
  student_name: string;
  class_name: string;
  teacher_name: string;
  date: string;
  slot: number;
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
    // Theme from settings
    try {
      const saved = localStorage.getItem('sas_settings');
      if (saved) {
        const s = JSON.parse(saved);
        document.documentElement.style.colorScheme = s.themeDark ? 'dark' : 'light';
      }
    } catch {}
    const handler = (e: any) => {
      const s = e?.detail; if (!s) return;
      document.documentElement.style.colorScheme = s.themeDark ? 'dark' : 'light';
    };
    window.addEventListener('sas_settings_changed' as any, handler);
    return () => window.removeEventListener('sas_settings_changed' as any, handler);
  }, [studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const studentResponse = await fetch(`http://localhost:8080/api/thongbao/students/${studentId}`);
      const studentData = await studentResponse.json();
      if (studentData.success) { setStudentInfo(studentData.data); }

      const mockRecords: AttendanceRecord[] = [
        { id: 1, student_id: studentId, student_name: studentData.data?.full_name || "Sinh viên", class_name: "PRN 212", teacher_name: "Phong", date: "2025-10-08", slot: 2, attendance_code: "CT08", status: "attended" },
        { id: 2, student_id: studentId, student_name: studentData.data?.full_name || "Sinh viên", class_name: "SWT 301", teacher_name: "Vinh", date: "2025-10-08", slot: 1, attendance_code: "CT01", status: "attended" },
        { id: 3, student_id: studentId, student_name: studentData.data?.full_name || "Sinh viên", class_name: "SWP391", teacher_name: "Phuc", date: "2025-10-07", slot: 1, attendance_code: "CT13", status: "absent" }
      ];
      setAttendanceRecords(mockRecords);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

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
          <button className="qr-btn">📷 Quét QR</button>
          <button className="qr-btn" onClick={() => { 
            if (confirm('Bạn có chắc muốn đăng xuất?')) {
              localStorage.removeItem('sas_user'); 
              window.location.href = '/login'; 
            }
          }}>🚪 Đăng xuất</button>
        </div>
      </header>
      <main className="main">{children}</main>
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
