"use client";

import Link from "next/link";
import { useEffect, useState, PropsWithChildren, Dispatch, SetStateAction } from "react";

interface StudentInfo {
  student_id: string;
  full_name: string;
  course: string;
  classes: string;
  major?: string;
  advisor_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  status?: 'active' | 'locked';
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

  // Lấy studentId từ localStorage
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

  // Load student info
  useEffect(() => {
    async function fetchInfo() {
      if (!studentId) return;
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
        const res = await fetch(`${base}/api/thongbao/students/${studentId}`, {
          credentials: 'include'
        });
        const data = await res.json();
        console.log("📥 Fetched student data:", data);
        if (data?.success) {
          setStudent(data.data);
          console.log("👤 Student info:", data.data);
          console.log("🖼️ Avatar URL from DB:", data.data.avatar_url);
          
          // Xử lý URL ảnh đúng cách
          const avatarUrl = data.data.avatar_url || "/avatar.png";
          if (avatarUrl === "/avatar.png" || avatarUrl.startsWith('http')) {
            setPhotoUrl(avatarUrl);
          } else {
            const timestamp = new Date().getTime();
            setPhotoUrl(`${base}${avatarUrl}?t=${timestamp}`);
          }
          console.log("🎨 Final photo URL:", avatarUrl === "/avatar.png" || avatarUrl.startsWith('http') ? avatarUrl : `${base}${avatarUrl}?t=${new Date().getTime()}`);
        }
      } catch (err) {
        console.error("❌ Error fetching student info:", err);
      }
    }
    fetchInfo();
  }, [studentId]);

  // Load settings từ localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sas_settings');
      if (saved) {
        const s = JSON.parse(saved);
        if (typeof s.notifEnabled === 'boolean') setNotifEnabled(s.notifEnabled);
        if (typeof s.themeDark === 'boolean') {
          setThemeDark(s.themeDark);
          document.documentElement.classList.add(s.themeDark ? 'dark-theme' : 'light-theme');
        }
        if (typeof s.lang === 'string') setLang(s.lang);
      }
    } catch { }
  }, []);

  const setTheme = (dark: boolean) => {
    setThemeDark(dark);
    const saved = localStorage.getItem('sas_settings');
    const prev = saved ? JSON.parse(saved) : {};
    const merged = { ...prev, themeDark: dark };
    localStorage.setItem('sas_settings', JSON.stringify(merged));
    document.documentElement.classList.remove(dark ? 'light-theme' : 'dark-theme');
    document.documentElement.classList.add(dark ? 'dark-theme' : 'light-theme');
  };

  const handleSaveSettings = () => {
    const settings = { notifEnabled, themeDark, lang };
    localStorage.setItem('sas_settings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('sas_settings_changed', { detail: settings }));
    alert("Đã lưu thay đổi.");
  };

const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !student) {
    alert("❌ Chưa có file hoặc thông tin sinh viên!");
    return;
  }

  console.log("📤 Uploading avatar:", file.name, "for student:", student.student_id);

  const formData = new FormData();
  formData.append("avatar", file); // phải trùng với multer.single("avatar")
  formData.append("student_id", student.student_id); // thêm đúng trường backend cần

  try {
    console.log("🔄 Sending request to:", "http://localhost:8080/api/students/update-avatar");
    const res = await fetch("http://localhost:8080/api/students/update-avatar", {
      method: "POST",
      body: formData,
    });

    console.log("📥 Response status:", res.status, res.statusText);

    let data;
    try {
      data = await res.json();
      console.log("📦 Response data:", data);
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      const text = await res.text();
      console.error("📄 Response text:", text);
      alert("❌ Lỗi: Phản hồi từ máy chủ không hợp lệ (không phải JSON).");
      return;
    }

    if (!data || data.success === false) {
      alert(`❌ Upload avatar thất bại: ${data.message || "Không rõ lỗi"}`);
      return;
    }

    // ✅ Cập nhật ảnh hiển thị + lưu vào state
    // Thêm timestamp để buộc browser reload ảnh mới
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
    const timestamp = new Date().getTime();
    const newAvatarUrl = `${base}${data.avatar_url}?t=${timestamp}`;
    console.log("✅ New avatar URL:", newAvatarUrl);
    setPhotoUrl(newAvatarUrl);

    // ✅ Cập nhật student state để hiển thị đúng ảnh
    setStudent((prev) => prev ? { ...prev, avatar_url: data.avatar_url } : prev);

    alert("✅ Cập nhật avatar thành công!");
  } catch (err) {
    console.error("❌ Upload error:", err);
    alert("❌ Lỗi kết nối máy chủ hoặc upload thất bại.");
  }
};


  const handleChangePassword = async () => {
    if (!oldPw || !newPw || !confirmPw) return alert("Vui lòng nhập đầy đủ mật khẩu.");
    if (newPw.length < 6) return alert("Mật khẩu mới phải >=6 ký tự");
    if (newPw !== confirmPw) return alert("Xác nhận mật khẩu không khớp");

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
      alert("❌ Lỗi kết nối máy chủ!");
    }
  };

  const handleLogoutAll = () => alert("Đã đăng xuất tất cả thiết bị.");

  return (
    <Shell collapsed={collapsed} setCollapsed={setCollapsed} student={student} themeDark={themeDark}>
      <div className="container">

        {/* Thông tin cá nhân */}
        <div className="card">
          <div className="section-title">👤 Thông tin cá nhân</div>
          <div className="hero">
            <div className="avatar-wrap">
              <img 
                src={photoUrl} 
                className="avatar-lg" 
                alt="avatar"
                onError={(e) => {
                  console.error("Lỗi load ảnh:", photoUrl);
                  e.currentTarget.src = "/avatar.png";
                }}
              />
              <label className="avatar-edit">📷
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </label>
            </div>
            <div>
              <div className="name">{student?.full_name || ''}</div>
              <div className="tag">{student?.course || ''}</div>
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
                <input className="input" value={student?.course || ''} disabled />
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSaveSettings}>Lưu thay đổi</button>
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
              <div className={`theme-opt ${!themeDark ? 'active' : ''}`} onClick={() => setTheme(false)}>🌞 Sáng</div>
              <div className={`theme-opt ${themeDark ? 'active' : ''}`} onClick={() => setTheme(true)}>🌑 Tối</div>
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
