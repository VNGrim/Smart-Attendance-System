"use client";

import Link from "next/link";
import { useEffect, useState, PropsWithChildren, Dispatch, SetStateAction } from "react";

interface StudentInfo {
  student_id: string;
  full_name: string;
  course: string;
}

type ShellProps = {
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
  student: StudentInfo | null;
  themeDark: boolean;
};

function Shell({ children, collapsed, setCollapsed, student, themeDark }: PropsWithChildren<ShellProps>) {
  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''} ${themeDark ? '' : 'light-theme'}`}>
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

  // Fetch student info
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

  // Load settings
  useEffect(() => {
  try {
    const saved = localStorage.getItem('sas_settings');
    if (saved) {
      const s = JSON.parse(saved);
      setThemeDark(s.themeDark ?? true);

      // Áp dụng ngay cho <html>
      if (s.themeDark) {
        document.documentElement.classList.add('dark-theme');
        document.documentElement.classList.remove('light-theme');
      } else {
        document.documentElement.classList.add('light-theme');
        document.documentElement.classList.remove('dark-theme');
      }
    }
  } catch {}
}, []);


 const setTheme = (dark: boolean) => {
  setThemeDark(dark);

  // Lưu vào localStorage
  const saved = localStorage.getItem('sas_settings');
  const prev = saved ? JSON.parse(saved) : {};
  const merged = { ...prev, themeDark: dark };
  localStorage.setItem('sas_settings', JSON.stringify(merged));

  // Áp dụng class cho toàn bộ <html>
  if (dark) {
    document.documentElement.classList.add('dark-theme');
    document.documentElement.classList.remove('light-theme');
  } else {
    document.documentElement.classList.add('light-theme');
    document.documentElement.classList.remove('dark-theme');
  }
  // Thông báo cho các component khác (nếu cần)
  window.dispatchEvent(new CustomEvent('sas_settings_changed', { detail: merged }));
};


  const handleSave = async () => {
    const settings = { notifEnabled, themeDark, lang };
    try {
      localStorage.setItem('sas_settings', JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('sas_settings_changed', { detail: settings }));
      alert("Đã lưu thay đổi.");
    } catch {}
  };

  const handleLogoutAll = async () => {
    alert("Đã đăng xuất tất cả thiết bị.");
  };

  const handleChangePassword = async () => {
    if (!oldPw || !newPw || !confirmPw) return alert("⚠️ Vui lòng nhập đầy đủ mật khẩu cũ, mật khẩu mới và xác nhận mật khẩu.");
    if (newPw.length < 6) return alert("⚠️ Mật khẩu mới phải từ 6 ký tự trở lên.");
    if (oldPw === newPw) return alert("⚠️ Mật khẩu mới phải khác mật khẩu cũ.");
    if (newPw !== confirmPw) return alert("⚠️ Mật khẩu xác nhận không khớp với mật khẩu mới.");

    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
      const res = await fetch(`${base}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw, confirmPassword: confirmPw }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert("✅ Đổi mật khẩu thành công!");
        setPwModal(false);
        setOldPw(""); setNewPw(""); setConfirmPw("");
      } else alert(`❌ Lỗi: ${data.message || "Không thể đổi mật khẩu"}`);
    } catch {
      alert("❌ Lỗi kết nối tới máy chủ!");
    }
  };

  return (
    <Shell collapsed={collapsed} setCollapsed={setCollapsed} student={student} themeDark={themeDark}>
      <div className="container">
        {/* Thông tin cá nhân */}
        <div className="card">
          <div className="section-title">👤 Thông tin cá nhân</div>
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
            <div className="info-grid">
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
            <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
              Thay đổi ảnh
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPhotoUrl(URL.createObjectURL(file));
              }} />
            </label>
            <button className="btn btn-primary" onClick={handleSave}>Lưu thay đổi</button>
          </div>
        </div>

        {/* Cài đặt tài khoản */}
        <div className="card">
          <div className="section-title">⚙️ Cài đặt tài khoản</div>
          <div className="form">
            <div className="tile">
              <div>🔒</div>
              <div>
                <div className="title">Đổi mật khẩu</div>
                <div className="desc">Tăng cường bảo mật tài khoản</div>
              </div>
              <button className="btn btn-outline" onClick={() => setPwModal(true)}>Mở</button>
            </div>
            <div className="tile">
              <div>🚪</div>
              <div>
                <div className="title">Đăng xuất tất cả thiết bị</div>
                <div className="desc">Buộc đăng xuất trên các thiết bị đã đăng nhập</div>
              </div>
              <button className="btn btn-outline" onClick={handleLogoutAll}>Mở</button>
            </div>

            {/* Notifications */}
            <div className="label">Thông báo</div>
            <div className="switch" onClick={() => setNotifEnabled(v => !v)}>
              <input type="checkbox" checked={notifEnabled} readOnly />
              <div className="knob"></div>
            </div>

            {/* Theme toggle */}
            <div className="Giao diện">
              <div
                className={`theme-opt ${!themeDark ? 'active' : ''}`}
                onClick={() => setTheme(false)}
              >
                🌞 Sáng
              </div>
              <div
                className={`theme-opt ${themeDark ? 'active' : ''}`}
                onClick={() => setTheme(true)}
              >
                🌑 Tối
              </div>
            </div>


            

            {/* Language */}
            <div className="label">Ngôn ngữ</div>
            <select className="select" value={lang} onChange={e => setLang(e.target.value)} style={{ width: '100%' }}>
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Modal đổi mật khẩu */}
      <div className={`modal ${pwModal ? 'active' : ''}`} onClick={() => setPwModal(false)}>
        <div className="modal-card" onClick={e => e.stopPropagation()}>
          <div className="modal-title">Đổi mật khẩu</div>
          <form className="form" onSubmit={e => { e.preventDefault(); handleChangePassword(); }}>
            <div>
              <div className="label">Mật khẩu cũ</div>
              <input type="password" className="input" value={oldPw} onChange={e => setOldPw(e.target.value)} />
            </div>
            <div className="row">
              <div>
                <div className="label">Mật khẩu mới</div>
                <input type="password" className="input" value={newPw} onChange={e => setNewPw(e.target.value)} />
              </div>
              <div>
                <div className="label">Nhập lại mật khẩu mới</div>
                <input type="password" className="input" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setPwModal(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary">Lưu</button>
            </div>
          </form>
        </div>
      </div>
    </Shell>
  );
}
