"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const colors = ["#F9A8D4", "#A7F3D0", "#BFDBFE", "#FDE68A", "#C7D2FE", "#FDBA74"];

interface ClassInfo {
  class_id: string;
  class_name: string;
  subject_name: string;
  students: number;
  semester: string;
  school_year: string;
}

export default function LopGVPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [teacherInfo, setTeacherInfo] = useState({ full_name: 'Giảng viên', teacher_id: 'MAS291' });
  const [loading, setLoading] = useState(true);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [announcementData, setAnnouncementData] = useState({
    title: '',
    content: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch classes data from backend
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        // For now, using mock data. In real implementation, you would call:
        // const response = await fetch(`/api/lop/teacher/${teacherInfo.teacher_id}/classes`);
        // const data = await response.json();
        
        // Mock data for demonstration
        const mockClasses = [
          { class_id: "1", class_name: "SE18A", subject_name: "Lập trình Web", students: 17, semester: "1", school_year: "2024-2025" },
          { class_id: "2", class_name: "SE19C", subject_name: "Cơ sở dữ liệu", students: 19, semester: "1", school_year: "2024-2025" },
          { class_id: "3", class_name: "QE18B", subject_name: "Toán rời rạc", students: 19, semester: "1", school_year: "2024-2025" },
          { class_id: "4", class_name: "SE18C", subject_name: "Cấu trúc dữ liệu", students: 20, semester: "1", school_year: "2024-2025" },
        ];
        
        setClasses(mockClasses);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching classes:", error);
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAnnouncementModal) {
        handleCloseModal();
      }
    };

    if (showAnnouncementModal) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showAnnouncementModal]);

  const handleViewStudents = (classId: string) => {
    // Navigate to student list page or show modal
    console.log("View students for class:", classId);
    // You can implement navigation or modal here
  };

  const handleViewAnnouncements = (classId: string) => {
    // Find the selected class
    const classInfo = classes.find(cls => cls.class_id === classId);
    if (classInfo) {
      setSelectedClass(classInfo);
      setShowAnnouncementModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowAnnouncementModal(false);
    setSelectedClass(null);
    setAnnouncementData({ title: '', content: '' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAnnouncementData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!announcementData.title.trim() || !announcementData.content.trim()) {
      alert('Vui lòng điền đầy đủ tiêu đề và nội dung thông báo');
      return;
    }

    setSubmitting(true);
    
    try {
      // Call API to create announcement
      const response = await fetch(`/api/lop/classes/${selectedClass?.class_id}/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: announcementData.title,
          content: announcementData.content,
          teacherId: teacherInfo.teacher_id
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Gửi thông báo thành công!');
        handleCloseModal();
      } else {
        alert('Có lỗi xảy ra: ' + result.message);
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Có lỗi xảy ra khi gửi thông báo');
    } finally {
      setSubmitting(false);
    }
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="layout">
      <aside className="sidebar">
        <div className="side-header">
          <div className="side-name">
            Chào mừng,<br />
            {teacherInfo.full_name}
          </div>
        </div>
        <nav className="side-nav">
          <Link href="/thongbao_gv" className="side-link">🔔 Thông báo</Link>
          <Link href="/lichgiangday_gv" className="side-link">📅 Lịch giảng dạy</Link>
          <div className="side-link active">👥 Lớp học</div>
          <Link href="/caidat_gv" className="side-link">⚙️ Cài đặt</Link>
        </nav>
      </aside>
      <header className="topbar">
        <div className="side-header" style={{ padding: 0 }}>
          <strong style={{ color: "white" }}>Lớp học</strong>
        </div>
        <div className="controls"></div>
      </header>
      <main className="main">{children}</main>
    </div>
  );

  if (loading) {
    return (
      <Shell>
        <div style={{ width: "1137px", margin: "40px auto", textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#666" }}>Đang tải dữ liệu...</div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ width: "1137px", margin: "40px auto" }}>
        {classes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            <div style={{ fontSize: "18px" }}>Chưa có lớp học nào</div>
          </div>
        ) : (
          classes.map((cls, idx) => {
            const bgColor = colors[idx % colors.length];
            return (
              <div
                key={cls.class_id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fff",
                  padding: "16px 24px",
                  borderRadius: "12px",
                  marginBottom: "16px",
                  fontWeight: 600,
                  color: "#333",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                  border: `2px solid ${bgColor}`,
                }}
              >
                <div>
                  <div style={{ fontSize: "16px", fontWeight: "700" }}>
                    {cls.class_name} - {cls.subject_name}
                  </div>
                  <div style={{ fontSize: "14px", color: "#555", marginTop: "4px" }}>
                    {cls.semester} - {cls.school_year} &nbsp; ({cls.students} sinh viên)
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => handleViewStudents(cls.class_id)}
                    style={{
                      background: "#49998A",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 14px",
                      cursor: "pointer",
                    }}
                  >
                    Danh sách
                  </button>
                  <button
                    onClick={() => handleViewAnnouncements(cls.class_id)}
                    style={{
                      background: "#FFD700",
                      color: "#000",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 14px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Thông báo
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div 
          className="modal-overlay"
          onClick={handleCloseModal}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '700',
                color: '#1f2937'
              }}>
                Gửi thông báo cho lớp {selectedClass?.class_name}
              </h2>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitAnnouncement}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Tiêu đề thông báo *
                </label>
                <input
                  type="text"
                  name="title"
                  value={announcementData.title}
                  onChange={handleInputChange}
                  placeholder="Nhập tiêu đề thông báo..."
                  className="modal-input"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Nội dung thông báo *
                </label>
                <textarea
                  name="content"
                  value={announcementData.content}
                  onChange={handleInputChange}
                  placeholder="Nhập nội dung thông báo..."
                  rows={6}
                  className="modal-textarea"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                  required
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="modal-button"
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="modal-button"
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: submitting ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {submitting ? 'Đang gửi...' : 'Gửi thông báo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
