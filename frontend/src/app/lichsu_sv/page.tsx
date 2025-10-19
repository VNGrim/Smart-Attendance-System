"use client";

import Link from "next/link";
import QRButton from "@/app/components/QRButton";
import { useState, useEffect } from "react";

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
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Đọc studentId từ localStorage nếu có
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
  }, [studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch student info
      const studentResponse = await fetch(`http://localhost:8080/api/thongbao/students/${studentId}`);
      const studentData = await studentResponse.json();

      if (studentData.success) {
        setStudentInfo(studentData.data);
      }

      // Fetch attendance records (mock data for now)
      const mockRecords: AttendanceRecord[] = [
        {
          id: 1,
          student_id: studentId,
          student_name: studentData.data?.full_name || "Sinh viên",
          class_name: "PRN 212",
          teacher_name: "Phong",
          date: "8/10/2025",
          slot: 2,
          attendance_code: "CT08",
          status: "attended"
        },
        {
          id: 2,
          student_id: studentId,
          student_name: studentData.data?.full_name || "Sinh viên",
          class_name: "SWT 301",
          teacher_name: "Vinh",
          date: "8/10/2025",
          slot: 1,
          attendance_code: "CT01",
          status: "attended"
        },
        {
          id: 3,
          student_id: studentId,
          student_name: studentData.data?.full_name || "Sinh viên",
          class_name: "SWP391",
          teacher_name: "Phuc",
          date: "7/10/2025",
          slot: 1,
          attendance_code: "CT13",
          status: "absent"
        }
      ];

      setAttendanceRecords(mockRecords);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'attended': return 'Đã điểm danh';
      case 'absent': return 'Vắng';
      case 'late': return 'Đi muộn';
      default: return 'Không xác định';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'attended': return 'status-badge attended';
      case 'absent': return 'status-badge absent';
      case 'late': return 'status-badge late';
      default: return 'status-badge';
    }
  };

  if (loading) {
    return (
      <div>
        <div className="user-qr">
          <div className="user">
            <img src="/avatar.png" alt="avatar" />
            <div className="name">{studentInfo?.full_name || "Đang tải..."}</div>
          </div>
          <QRButton />
        </div>

        <div className="header-bottom sas-header-bg" style={{ justifyContent: "center", gap: 0 }}>
          <div className="sas-tabs">
            <Link href="/thongbao_sv" className="sas-tab">Thông báo</Link>
            <Link href="/lichhoc_sv" className="sas-tab">Lịch học</Link>
            <div className="sas-tab active">Lịch sử</div>
          </div>
        </div>

        <div className="container">
          <div className="card">
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Đang tải lịch sử điểm danh...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="user-qr">
          <div className="user">
            <img src="/avatar.png" alt="avatar" />
            <div className="name">{studentInfo?.full_name || "Sinh viên"}</div>
          </div>
          <QRButton />
        </div>

        <div className="header-bottom sas-header-bg" style={{ justifyContent: "center", gap: 0 }}>
          <div className="sas-tabs">
            <Link href="/thongbao_sv" className="sas-tab">Thông báo</Link>
            <Link href="/lichhoc_sv" className="sas-tab">Lịch học</Link>
            <div className="sas-tab active">Lịch sử</div>
          </div>
        </div>

        <div className="container">
          <div className="card">
            <div className="error">
              <div className="error-icon">⚠️</div>
              <p>{error}</p>
              <button onClick={fetchData} className="retry-btn">Thử lại</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header với user info và QR button */}
      <div className="user-qr">
        <div className="user">
          <img src="/avatar.png" alt="avatar" />
          <div className="name">{studentInfo?.full_name || "Sinh viên"}</div>
        </div>
        <QRButton />
      </div>

      {/* Navigation bar */}
      <div className="header-bottom sas-header-bg" style={{ justifyContent: "center", gap: 0 }}>
        <div className="sas-tabs">
          <Link href="/thongbao_sv" className="sas-tab">Thông báo</Link>
          <Link href="/lichhoc_sv" className="sas-tab">Lịch học</Link>
          <div className="sas-tab active">Lịch sử</div>
        </div>
      </div>

      {/* Main content - Bảng lịch sử */}
      <div className="container">
        <div className="card">
          {attendanceRecords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>Chưa có lịch sử điểm danh nào</p>
            </div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>MSSV</th>
                  <th>Lớp</th>
                  <th>Giáo viên</th>
                  <th>Ngày</th>
                  <th>Mã điểm danh</th>
                  <th>Điểm danh</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.student_name} - {record.student_id}</td>
                    <td>{record.class_name}</td>
                    <td>{record.teacher_name}</td>
                    <td>{record.date} - slot {record.slot}</td>
                    <td>{record.attendance_code}</td>
                    <td>
                      <span className={getStatusClass(record.status)}>
                        {getStatusText(record.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
