"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TabKey = "general" | "security" | "semester" | "integrations";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount] = useState(1);
  const [tab, setTab] = useState<TabKey>("general");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sas_settings");
      if (saved) {
        const s = JSON.parse(saved);
        setDark(!!s.themeDark);
        document.documentElement.style.colorScheme = s.themeDark ? "dark" : "light";
      }
    } catch {}
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    try {
      const saved = localStorage.getItem("sas_settings");
      const prev = saved ? JSON.parse(saved) : {};
      const merged = { ...prev, themeDark: next };
      localStorage.setItem("sas_settings", JSON.stringify(merged));
      document.documentElement.style.colorScheme = next ? "dark" : "light";
      window.dispatchEvent(new CustomEvent("sas_settings_changed" as any, { detail: merged }));
    } catch {}
  };

  const [sysName, setSysName] = useState("Học viện Kỹ thuật số");
  const [logo, setLogo] = useState<string | null>(null);
  const [language, setLanguage] = useState("Tiếng Việt");
  const [timezone, setTimezone] = useState("GMT+7 (Asia/Ho_Chi_Minh)");
  const [schoolYear, setSchoolYear] = useState("2025–2026");
  const [semester, setSemester] = useState("Học kỳ 1");

  const [limitAttempts, setLimitAttempts] = useState(5);
  const [lockMinutes, setLockMinutes] = useState(15);
  const [passwordPolicy, setPasswordPolicy] = useState("Tối thiểu 8 ký tự, có số & ký tự đặc biệt");
  const [rememberMe, setRememberMe] = useState(true);
  const [sessionExpire, setSessionExpire] = useState(60);
  const [twoFA, setTwoFA] = useState(false);

  const [semesterStart, setSemesterStart] = useState("2025-09-02");
  const [weeks, setWeeks] = useState(15);
  const [daysOff, setDaysOff] = useState<string[]>(["Thứ 7", "Chủ nhật"]);
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [rules, setRules] = useState("Tránh trùng giảng viên & phòng");

  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const warnings = useMemo(() => {
    const w: string[] = [];
    if (lockMinutes > 60) w.push("Thời gian khóa tạm không nên vượt 60 phút");
    if (limitAttempts < 3) w.push("Giới hạn đăng nhập sai nên ≥ 3");
    if (weeks < 8) w.push("Số tuần mỗi học kỳ bất thường (<8)");
    return w;
  }, [lockMinutes, limitAttempts, weeks]);

  const saveAll = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert("Đã lưu thay đổi cấu hình (mock)");
    }, 500);
  };

  const restoreDefaults = () => {
    if (!confirm("Khôi phục mặc định?")) return;
    setSysName("Smart Attendance System");
    setLogo(null);
    setLanguage("Tiếng Việt");
    setTimezone("GMT+7 (Asia/Ho_Chi_Minh)");
    setSchoolYear("2025–2026");
    setSemester("Học kỳ 1");
    setLimitAttempts(5);
    setLockMinutes(15);
    setPasswordPolicy("Tối thiểu 8 ký tự, có số & ký tự đặc biệt");
    setRememberMe(true);
    setSessionExpire(60);
    setTwoFA(false);
    setSemesterStart("2025-09-02");
    setWeeks(15);
    setDaysOff(["Thứ 7", "Chủ nhật"]);
    setAutoSchedule(true);
    setRules("Tránh trùng giảng viên & phòng");
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className={`layout ${collapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="side-header">
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Mở rộng" : "Thu gọn"}>
            {collapsed ? "➡️" : "⬅️"}
          </button>
          {!collapsed && <div className="side-name">Smart Attendance</div>}
        </div>
        <nav className="side-nav">
          <Link href="/tongquan_ad" className="side-link" title="Dashboard">🏠 {!collapsed && "Dashboard"}</Link>
          <Link href="/thongbao_ad" className="side-link" title="Thông báo">📢 {!collapsed && "Thông báo"}</Link>
          <Link href="/sinhvien_ad" className="side-link" title="Sinh viên">👨‍🎓 {!collapsed && "Sinh viên"}</Link>
          <Link href="/giangvien_ad" className="side-link" title="Giảng viên">👩‍🏫 {!collapsed && "Giảng viên"}</Link>
          <Link href="/lophoc_ad" className="side-link" title="Lớp học">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/lichhoc_ad" className="side-link" title="Lịch học">📅 {!collapsed && "Lịch học"}</Link>
          <Link href="/taikhoan_ad" className="side-link" title="Tài khoản">🔑 {!collapsed && "Tài khoản"}</Link>
          <Link href="/caidat_ad" className="side-link active" title="Cấu hình">⚙️ {!collapsed && "Cấu hình"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="page-title">Cấu hình hệ thống</div>
        <div className="controls">
          <button className="btn-outline" onClick={restoreDefaults}>🔁 Khôi phục mặc định</button>
          <button className="btn-primary" onClick={saveAll} disabled={saving}>{saving?"Đang lưu...":"💾 Lưu thay đổi"}</button>
          <button className="icon-btn" onClick={toggleDark} title="Chuyển giao diện">{dark?"🌙":"🌞"}</button>
          <button className="icon-btn" title="Thông báo">🔔{notifCount>0 && <span className="badge">{notifCount}</span>}</button>
        </div>
      </header>

      <main className="main">{children}</main>
    </div>
  );

  const GeneralTab = () => (
    <div className="panel">
      <div className="grid2">
        <div className="form">
          <div className="kv"><div className="k">Tên hệ thống</div><input className="input" value={sysName} onChange={(e)=>setSysName(e.target.value)} placeholder="Smart Attendance System" /></div>
          <div className="kv"><div className="k">Logo hệ thống</div><div>
            <input className="input" type="file" accept="image/*" onChange={(e)=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>setLogo(r.result as string); r.readAsDataURL(f); }} />
          </div></div>
          <div className="kv"><div className="k">Ngôn ngữ mặc định</div>
            <select className="input" value={language} onChange={(e)=>setLanguage(e.target.value)}>
              <option>Tiếng Việt</option>
              <option>English</option>
            </select>
          </div>
          <div className="kv"><div className="k">Múi giờ</div>
            <select className="input" value={timezone} onChange={(e)=>setTimezone(e.target.value)}>
              <option>GMT+7 (Asia/Ho_Chi_Minh)</option>
              <option>GMT+8 (Asia/Singapore)</option>
              <option>GMT+9 (Asia/Tokyo)</option>
            </select>
          </div>
          <div className="kv"><div className="k">Năm học hiện tại</div><input className="input" value={schoolYear} onChange={(e)=>setSchoolYear(e.target.value)} placeholder="2025–2026" /></div>
          <div className="kv"><div className="k">Học kỳ hiện tại</div>
            <select className="input" value={semester} onChange={(e)=>setSemester(e.target.value)}>
              <option>Học kỳ 1</option>
              <option>Học kỳ 2</option>
              <option>Hè</option>
            </select>
          </div>
          <div className="actions">
            <button className="btn-outline" onClick={restoreDefaults}>🔄 Đặt lại mặc định</button>
            <button className="btn-primary" onClick={saveAll}>💾 Lưu thay đổi</button>
          </div>
        </div>
        <div className="preview">
          <div className="logo">{logo ? <img src={logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} /> : "LOGO"}</div>
          <div><strong>{sysName}</strong></div>
          <div>Ngôn ngữ: {language}</div>
          <div>Múi giờ: {timezone}</div>
          <div>Năm học: {schoolYear}</div>
          <div>Học kỳ: {semester}</div>
        </div>
      </div>
    </div>
  );

  const SecurityTab = () => (
    <div className="panel">
      <div className="form">
        <div className="kv"><div className="k">Giới hạn đăng nhập sai</div><input className="input" type="number" min={1} value={limitAttempts} onChange={(e)=>setLimitAttempts(parseInt(e.target.value||"0"))} /></div>
        <div className="kv"><div className="k">Khóa tạm sau khi sai</div>
          <select className="input" value={lockMinutes} onChange={(e)=>setLockMinutes(parseInt(e.target.value))}>
            <option value={5}>5 phút</option>
            <option value={15}>15 phút</option>
            <option value={30}>30 phút</option>
            <option value={60}>60 phút</option>
          </select>
        </div>
        <div className="kv"><div className="k">Mật khẩu tối thiểu</div><input className="input" value={passwordPolicy} onChange={(e)=>setPasswordPolicy(e.target.value)} placeholder="Tối thiểu 8 ký tự..." /></div>
        <div className="kv"><div className="k">Cho phép “Ghi nhớ đăng nhập”</div><input className="switch" type="checkbox" checked={rememberMe} onChange={(e)=>setRememberMe(e.target.checked)} /></div>
        <div className="kv"><div className="k">Hết hạn phiên làm việc</div>
          <select className="input" value={sessionExpire} onChange={(e)=>setSessionExpire(parseInt(e.target.value))}>
            <option value={30}>30 phút</option>
            <option value={60}>60 phút</option>
            <option value={120}>120 phút</option>
          </select>
        </div>
        <div className="kv"><div className="k">Cho phép xác thực 2 bước (2FA)</div><input className="switch" type="checkbox" checked={twoFA} onChange={(e)=>setTwoFA(e.target.checked)} /></div>
        {warnings.length>0 && (
          <div className="panel" style={{ background: "#fff8e1" }}>
            {warnings.map((w,i)=>(<div key={i}>⚠️ {w}</div>))}
          </div>
        )}
        <div className="actions">
          <button className="btn-outline" onClick={restoreDefaults}>🔄 Đặt lại mặc định</button>
          <button className="btn-primary" onClick={saveAll}>💾 Lưu thay đổi</button>
        </div>
      </div>
    </div>
  );

  const SemesterTab = () => (
    <div className="panel">
      <div className="grid2">
        <div className="form">
          <div className="kv"><div className="k">Ngày bắt đầu học kỳ</div><input className="input" type="date" value={semesterStart} onChange={(e)=>setSemesterStart(e.target.value)} /></div>
          <div className="kv"><div className="k">Số tuần mỗi học kỳ</div><input className="input" type="number" min={1} value={weeks} onChange={(e)=>setWeeks(parseInt(e.target.value||"0"))} /></div>
          <div className="kv"><div className="k">Ngày nghỉ mặc định</div>
            <select className="input" multiple value={daysOff} onChange={(e)=>{ const opts=Array.from(e.target.selectedOptions).map(o=>o.value); setDaysOff(opts); }} style={{ height: 90 }}>
              <option>Thứ 2</option>
              <option>Thứ 3</option>
              <option>Thứ 4</option>
              <option>Thứ 5</option>
              <option>Thứ 6</option>
              <option>Thứ 7</option>
              <option>Chủ nhật</option>
            </select>
          </div>
          <div className="kv"><div className="k">Tự động sắp xếp lịch</div><input className="switch" type="checkbox" checked={autoSchedule} onChange={(e)=>setAutoSchedule(e.target.checked)} /></div>
          <div className="kv"><div className="k">Quy tắc ưu tiên xếp lịch</div><textarea className="input" rows={3} value={rules} onChange={(e)=>setRules(e.target.value)} /></div>
          <div className="actions">
            <button className="btn-outline" onClick={restoreDefaults}>🔄 Đặt lại mặc định</button>
            <button className="btn-primary" onClick={saveAll}>💾 Lưu thay đổi</button>
          </div>
        </div>
        <div className="preview">
          <div className="logo">CAL</div>
          <div><strong>Mô phỏng lịch</strong></div>
          <div>Ngày bắt đầu: {semesterStart}</div>
          <div>Tuần: {weeks}</div>
          <div>Ngày nghỉ: {daysOff.join(", ") || "--"}</div>
          <div>Tự động xếp: {autoSchedule?"Bật":"Tắt"}</div>
        </div>
      </div>
    </div>
  );

  const IntegrationsTab = () => (
    <div className="panel">
      <div className="section-title">Kết nối & Tích hợp</div>
      <div className="form">
        <div className="kv"><div className="k">LMS API URL</div><input className="input" placeholder="https://lms.example.com/api" /></div>
        <div className="kv"><div className="k">LMS API Key</div><input className="input" placeholder="••••••••" /></div>
        <div className="kv"><div className="k">Portal SSO</div><input className="switch" type="checkbox" defaultChecked={false} /></div>
        <div className="actions">
          <button className="btn-outline" onClick={restoreDefaults}>🔄 Đặt lại mặc định</button>
          <button className="btn-primary" onClick={saveAll}>💾 Lưu thay đổi</button>
        </div>
      </div>
    </div>
  );

  return (
    <Shell>
      <div className="tabs">
        <button className={`tab ${tab==='general'?'active':''}`} onClick={()=>setTab('general')}>🔧 Cấu hình chung</button>
        <button className={`tab ${tab==='security'?'active':''}`} onClick={()=>setTab('security')}>🔐 Bảo mật & Xác thực</button>
        <button className={`tab ${tab==='semester'?'active':''}`} onClick={()=>setTab('semester')}>📅 Lịch học & Học kỳ</button>
        <button className={`tab ${tab==='integrations'?'active':''}`} onClick={()=>setTab('integrations')}>🧩 Tích hợp hệ thống</button>
      </div>

      {tab === 'general' && <GeneralTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'semester' && <SemesterTab />}
      {tab === 'integrations' && <IntegrationsTab />}

      {preview && (
        <div className="panel">Preview Mode</div>
      )}
    </Shell>
  );
}
