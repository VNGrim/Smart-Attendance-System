"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface StudentInfo {
  student_id: string;
  full_name: string;
  course: string;
}

export default function CaiDatPage() {
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("/avatar.png");
  const [notifEnabled, setNotifEnabled] = useState<boolean>(true);
  const [themeDark, setThemeDark] = useState<boolean>(true);
  const [lang, setLang] = useState<string>("vi");

  const [pwModal, setPwModal] = useState<boolean>(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const studentId = (() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem("sas_user");
      if (!raw) return "";
      const u = JSON.parse(raw);
      if (u?.role === "student" && typeof u?.userId === "string") return u.userId;
      return "";
    } catch { return ""; }
  })();

  useEffect(() => {
    async function fetchInfo() {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
        const res = await fetch(`${base}/api/thongbao/students/${studentId}`);
        const data = await res.json();
        if (data?.success) {
          setStudent({ student_id: data.data.student_id, full_name: data.data.full_name, course: data.data.course });
        }
      } catch {}
    }
    if (studentId) fetchInfo();
  }, [studentId]);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="side-header">
          <button className="collapse-btn" onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
            {collapsed ? '⮞' : '⮜'}
          </button>
          {!collapsed && (
            <div className="side-name">
              Chào mừng,<br />
              {student?.full_name || "Sinh viên"}
            </div>
          )}
        </div>
        <nav className="side-nav">
          <Link href="/tongquan_sv" className="side-link">🏠 {!collapsed && "Trang tổng quan"}</Link>
          <Link href="/thongbao_sv" className="side-link">🔔 {!collapsed && "Thông báo"}</Link>
          <Link href="/lichhoc_sv" className="side-link">📅 {!collapsed && "Lịch học"}</Link>
          <Link href="/lichsu_sv" className="side-link">🕘 {!collapsed && "Lịch sử"}</Link>
          <div className="side-link active">⚙️ {!collapsed && "Cài đặt"}</div>
        </nav>
      </aside>
      <header className="topbar">
        <div className="welcome">
          <div className="hello">Xin chào, {student?.full_name || "Sinh viên"} 👋</div>
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

  const handleSave = async () => {
    const settings = { notifEnabled, themeDark, lang };
    try {
      localStorage.setItem('sas_settings', JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('sas_settings_changed', { detail: settings }));
      alert("Đã lưu thay đổi.");
    } catch {}
  };

  const handleLogoutAll = async () => {
    // TODO: gọi API đăng xuất tất cả thiết bị
    alert("Đã đăng xuất tất cả thiết bị.");
  };

  const handleChangePassword = async () => {
    if (!oldPw || !newPw || newPw !== confirmPw) {
      alert("Vui lòng nhập đúng thông tin mật khẩu");
      return;
    }
    // TODO: gọi API đổi mật khẩu
    alert("Đổi mật khẩu thành công.");
    setPwModal(false);
    setOldPw(""); setNewPw(""); setConfirmPw("");
  };

  return (
    <Shell>
      <div className="container">
        {/* Left: Thông tin cá nhân */}
        <div className="card">
          <div className="section-title"><span className="icon">👤</span>Thông tin cá nhân</div>
          {/* Hero inside personal info */}
          <div className="hero">
            <div className="avatar-wrap">
              <img src={photoUrl} className="avatar-lg" alt="avatar" />
              <div className="avatar-edit">📷</div>
            </div>
            <div>
              <div className="name">{student?.full_name || 'Nguyen Van A'}</div>
              <div className="tag">Sinh viên Đại học FPT Quy Nhơn</div>
            </div>
          </div>
          <div className="form">
            <div className="divider"></div>
            <div className="info-grid">
              <div className="info-fields">
                <div>
                  <div className="label">Họ và tên</div>
                  <input className="input" value={student?.full_name || ''} disabled />
                </div>
                <div>
                  <div className="label">MSSV</div>
                  <input className="input" value={student?.student_id || ''} disabled />
                </div>
                <div className="full">
                  <div className="label">Khóa học</div>
                  <input className="input" value={student?.course || ''} readOnly />
                </div>
              </div>
              <div className="photo" style={{ alignSelf: 'start', justifyContent: 'flex-end' }}>
                <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                  Thay đổi ảnh
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setPhotoUrl(url);
                    }
                  }} />
                </label>
              </div>
            </div>

            <div>
              <button className="btn btn-primary" onClick={handleSave}>Lưu thay đổi</button>
            </div>
          </div>
        </div>

        {/* Right: Cài đặt tài khoản */}
        <div className="card">
          <div className="section-title"><span className="icon">⚙️</span>Cài đặt tài khoản</div>
          <div className="form">
            <div className="tile">
              <div>🔒</div>
              <div>
                <div className="title">Đổi mật khẩu</div>
                <div className="desc">Tăng cường bảo mật tài khoản của bạn</div>
              </div>
              <button className="btn btn-outline" onClick={() => setPwModal(true)}>Mở</button>
            </div>
            <div className="tile">
              <div>🚪</div>
              <div>
                <div className="title">Đăng xuất tất cả thiết bị</div>
                <div className="desc">Buộc đăng xuất trên các thiết bị đã đăng nhập</div>
              </div>
              <button className="btn btn-outline" onClick={handleLogoutAll}>Thực hiện</button>
            </div>

            <div>
              <div className="label">Thông báo</div>
              <div className="switch" onClick={() => setNotifEnabled(v => !v)}>
                <input type="checkbox" checked={notifEnabled} readOnly />
                <div className="knob"></div>
              </div>
            </div>

            <div>
              <div className="label">Giao diện</div>
              <div className="theme-toggle">
                <div className={`theme-opt ${!themeDark ? 'active' : ''}`} onClick={() => setThemeDark(false)}>
                  <span className="theme-ic">🌙</span> Sáng
                </div>
                <div className={`theme-opt ${themeDark ? 'active' : ''}`} onClick={() => setThemeDark(true)}>
                  <span className="theme-ic">🌑</span> Tối
                </div>
              </div>
            </div>

            <div>
              <div className="label">Ngôn ngữ</div>
              <div className="row" style={{ alignItems: 'center' }}>
                <select className="select" value={lang} onChange={(e) => setLang(e.target.value)} style={{ width: '100%' }}>
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal đổi mật khẩu */}
      <div className={`modal ${pwModal ? 'active' : ''}`} onClick={() => setPwModal(false)}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-title">Đổi mật khẩu</div>
          <div className="form">
            <div>
              <div className="label">Mật khẩu cũ</div>
              <input className="input" type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
            </div>
            <div className="row">
              <div>
                <div className="label">Mật khẩu mới</div>
                <input className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              </div>
              <div>
                <div className="label">Nhập lại mật khẩu mới</div>
                <input className="input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setPwModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleChangePassword}>Lưu</button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
