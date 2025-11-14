"use client";

import Link from "next/link";
import { useEffect, useState, PropsWithChildren, Dispatch, SetStateAction } from "react";
import { supabase } from "@/lib/supabaseClient";

interface TeacherInfo {
  teacher_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  department?: string;
  avatar_url?: string;
  status?: 'active' | 'locked';
}

type ShellProps = {
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
  teacher: TeacherInfo | null;
  themeDark: boolean;
};

function Shell({ children, collapsed, setCollapsed, teacher, themeDark }: PropsWithChildren<ShellProps>) {
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
              {teacher?.full_name || "Giảng viên"}
            </div>
          )}
        </div>
        <nav className="side-nav">
          <Link href="/tongquan_gv" className="side-link">🏠 {!collapsed && "Trang tổng quan"}</Link>
          <Link href="/thongbao_gv" className="side-link">📢 {!collapsed && "Thông báo"}</Link>
          <Link href="/lichday_gv" className="side-link">📅 {!collapsed && "Lịch giảng dạy"}</Link>
          <Link href="/lophoc_gv" className="side-link">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/diemdanh_gv" className="side-link">🧍‍♂️ {!collapsed && "Điểm danh"}</Link>
          <div className="side-link active">⚙️ {!collapsed && "Cài đặt"}</div>
        </nav>
      </aside>
      <header className="topbar">
        <div className="welcome">
          <div className="hello">Xin chào, {teacher?.full_name || "Giảng viên"} 👋</div>
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
      <main className="main">{children}</main>
    </div>
  );
}

export default function CaiDatGVPage() {
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("/avatar.png");
  const [notifEnabled, setNotifEnabled] = useState<boolean>(true);
  const [themeDark, setThemeDark] = useState<boolean>(true);
  const [lang, setLang] = useState<string>("vi");

  const [pwModal, setPwModal] = useState<boolean>(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // Lấy teacherId từ localStorage
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

  // Load teacher info
  useEffect(() => {
    async function fetchInfo() {
      if (!teacherId) return;
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
        const res = await fetch(`${base}/api/teachers/${teacherId}`, {
          credentials: 'include'
        });
        const data = await res.json();
        console.log("📥 Fetched teacher data:", data);
        if (data?.success) {
          setTeacher(data.data);
          console.log("👤 Teacher info:", data.data);
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
        console.error("❌ Error fetching teacher info:", err);
      }
    }
    fetchInfo();
  }, [teacherId]);

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
    // Dispatch event để các trang khác cập nhật
    console.log('🔔 Dispatching theme change event:', { themeDark: dark });
    window.dispatchEvent(new CustomEvent('sas_settings_changed', { detail: merged }));
  };

  const handleSaveSettings = () => {
    const settings = { notifEnabled, themeDark, lang };
    localStorage.setItem('sas_settings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('sas_settings_changed', { detail: settings }));
    alert("Đã lưu thay đổi.");
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !teacher) {
      alert("❌ Chưa có file hoặc thông tin giảng viên!");
      return;
    }

    if (!supabase) {
      alert("❌ Supabase chưa được cấu hình. Vui lòng kiểm tra NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    try {
      console.log("📤 Uploading avatar to Supabase:", file.name, "for teacher:", teacher.teacher_id);

      const ext = file.name.split(".").pop() || "png";
      const filePath = `${teacher.teacher_id}/avatar-${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("❌ Supabase upload error:", uploadError);
        alert("❌ Upload avatar lên Supabase thất bại.");
        return;
      }

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(uploadData?.path || filePath);

      const publicUrl = publicData?.publicUrl;
      if (!publicUrl) {
        alert("❌ Không lấy được public URL cho avatar.");
        return;
      }

      console.log("🌐 Supabase public URL (teacher):", publicUrl);

      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
      const res = await fetch(`${base}/api/teachers/update-avatar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ teacher_id: teacher.teacher_id, avatar_url: publicUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        console.error("❌ Backend teacher update-avatar error:", data);
        alert(`❌ Lưu avatar vào hệ thống thất bại: ${data?.message || "Không rõ lỗi"}`);
        return;
      }

      const timestamp = new Date().getTime();
      const newAvatarUrl = `${publicUrl}?t=${timestamp}`;
      setPhotoUrl(newAvatarUrl);
      setTeacher((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));

      alert("✅ Cập nhật avatar thành công!");
    } catch (err) {
      console.error("❌ Teacher avatar update error:", err);
      alert("❌ Lỗi khi cập nhật avatar.");
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
    <Shell collapsed={collapsed} setCollapsed={setCollapsed} teacher={teacher} themeDark={themeDark}>
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
              <div className="name">{teacher?.full_name || ''}</div>
              <div className="tag">{teacher?.department || 'Giảng viên'}</div>
            </div>
          </div>

          <div className="form">
            <div className="info-grid">
              <div>
                <div className="label">Họ và tên</div>
                <input className="input" value={teacher?.full_name || ''} disabled />
              </div>
              <div>
                <div className="label">Mã giảng viên</div>
                <input className="input" value={teacher?.teacher_id || ''} disabled />
              </div>
              <div>
                <div className="label">Email</div>
                <input className="input" value={teacher?.email || ''} disabled />
              </div>
              <div>
                <div className="label">Số điện thoại</div>
                <input className="input" value={teacher?.phone || ''} disabled />
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSaveSettings} style={{ marginTop: '20px' }}>Lưu thay đổi</button>
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
            <div className="label">Giao diện</div>
            <div className="theme-toggle">
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

