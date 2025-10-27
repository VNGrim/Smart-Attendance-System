      "use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Activity = {
  time: string;
  action: string;
  actor: string;
  id: string;
  detail?: string;
  rawTime?: string;
};

type CompositionBreakdown = Record<'students' | 'lecturers' | 'admins', number>;

type SemesterStat = {
  code: string;
  name: string;
  totalStudents: number;
  attendanceRatio: number;
};

function formatDateTime(input: unknown) {
  if (!input) return "—";
  const date = input instanceof Date ? input : new Date(input as string);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

const DONUT_CONFIG = [
  { key: 'students', label: 'Sinh viên', color: '#3B82F6' },
  { key: 'lecturers', label: 'Giảng viên', color: '#10B981' },
  { key: 'admins', label: 'Admin', color: '#8B5CF6' },
] as const;

const DEFAULT_SEMESTERS: SemesterStat[] = [
  { code: 'K18', name: 'Khoá K18', totalStudents: 0, attendanceRatio: 0 },
  { code: 'K19', name: 'Khoá K19', totalStudents: 0, attendanceRatio: 0 },
  { code: 'K20', name: 'Khoá K20', totalStudents: 0, attendanceRatio: 0 },
  { code: 'K21', name: 'Khoá K21', totalStudents: 0, attendanceRatio: 0 },
];

const DEFAULT_COMPOSITION_PERCENT: CompositionBreakdown = {
  students: 0.9,
  lecturers: 0.05,
  admins: 0.05,
};

const DEFAULT_TOTAL_USERS = 2473;

export default function AdminOverviewPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(false);
  const [notifCount] = useState(3);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [modal, setModal] = useState<Activity | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [studentDelta, setStudentDelta] = useState<number | null>(null);
  const [lecturerCount, setLecturerCount] = useState<number | null>(null);
  const [lecturerDelta, setLecturerDelta] = useState<number | null>(null);
  const [classCount, setClassCount] = useState<number | null>(null);
  const [sessionsTodayCount, setSessionsTodayCount] = useState<number | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [composition, setComposition] = useState<{ total: number; breakdown: CompositionBreakdown } | null>(null);
  const [compositionLoading, setCompositionLoading] = useState(true);
  const [compositionError, setCompositionError] = useState<string | null>(null);
  const [semesters, setSemesters] = useState<SemesterStat[]>(DEFAULT_SEMESTERS);
  const [semesterLoading, setSemesterLoading] = useState(true);
  const [semesterError, setSemesterError] = useState<string | null>(null);
  const [semesterDetail, setSemesterDetail] = useState<SemesterStat | null>(null);
  const [semesterDetailLoading, setSemesterDetailLoading] = useState(false);

  // Mock summary numbers
  const stats = {
    students: { value: 2340, delta: "+50 so với tháng trước" },
    lecturers: { value: 128, delta: "+10 so với tháng trước" },
    classes: { value: 64 },
    sessionsToday: { value: 32 },
  };

  const semesterBar = useMemo(() => semesters.map((s) => Math.max(0, Math.min(1, s.attendanceRatio))), [semesters]);
  const maxBar = Math.max(...semesterBar, 0.01);

  const totalUsers = composition?.total ?? DEFAULT_TOTAL_USERS;
  const donutParts = useMemo(() => {
    if (composition && composition.total > 0) {
      return DONUT_CONFIG.map((cfg) => ({
        key: cfg.key,
        label: cfg.label,
        color: cfg.color,
        value: composition.breakdown[cfg.key] / composition.total,
      }));
    }
    return DONUT_CONFIG.map((cfg) => ({
      key: cfg.key,
      label: cfg.label,
      color: cfg.color,
      value: DEFAULT_COMPOSITION_PERCENT[cfg.key],
    }));
  }, [composition]);

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

  useEffect(() => {
    (async () => {
      setCompositionLoading(true);
      setCompositionError(null);
      try {
        const res = await fetch("http://localhost:8080/api/admin/overview/composition", {
          credentials: "include",
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (typeof data?.total === "number" && data?.breakdown) {
          setComposition({
            total: data.total,
            breakdown: {
              students: Number(data.breakdown.students ?? 0),
              lecturers: Number(data.breakdown.lecturers ?? 0),
              admins: Number(data.breakdown.admins ?? 0),
            },
          });
        } else {
          setComposition(null);
        }
      } catch (err) {
        setCompositionError("Không tải được tỉ lệ thành phần");
        console.error("composition fetch error", err);
      } finally {
        setCompositionLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setSemesterLoading(true);
      setSemesterError(null);
      try {
        const res = await fetch("http://localhost:8080/api/admin/overview/semesters/attendance", {
          credentials: "include",
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (Array.isArray(data?.semesters)) {
          setSemesters(
            data.semesters.map((item: any) => ({
              code: String(item.code ?? ""),
              name: String(item.name ?? ""),
              totalStudents: Number(item.totalStudents ?? item.total_students ?? 0),
              attendanceRatio: Number(item.attendanceRatio ?? item.attendance_ratio ?? 0),
            }))
          );
        } else {
          setSemesters(DEFAULT_SEMESTERS);
        }
      } catch (err) {
        setSemesterError("Không tải được tổng quan học kỳ");
        setSemesters(DEFAULT_SEMESTERS);
        console.error("semester stats fetch error", err);
      } finally {
        setSemesterLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setActivityLoading(true);
      setActivityError(null);
      try {
        const res = await fetch("http://localhost:8080/api/admin/overview/activities/recent", {
          credentials: "include",
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (Array.isArray(data?.items)) {
          setActivity(
            data.items.map((item: any) => {
              const rawTime = typeof item.time === "string" ? item.time : item.time?.toString?.() ?? "";
              return {
                id: String(item.id ?? ""),
                action: String(item.action ?? ""),
                actor: String(item.actor ?? ""),
                detail: typeof item.detail === "string" ? item.detail : undefined,
                time: formatDateTime(rawTime),
                rawTime,
              } as Activity;
            })
          );
        } else {
          setActivity([]);
        }
      } catch (err: any) {
        setActivityError("Không tải được hoạt động gần đây");
        console.error("activities fetch error", err);
      } finally {
        setActivityLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:8080/api/admin/overview/students/count", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.count === "number") setStudentCount(data.count);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:8080/api/admin/overview/lecturers/count", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.count === "number") setLecturerCount(data.count);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:8080/api/admin/overview/classes/count", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.count === "number") setClassCount(data.count);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:8080/api/admin/overview/sessions/today/count", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.count === "number") setSessionsTodayCount(data.count);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:8080/api/admin/overview/students/monthly-delta", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.delta === "number") setStudentDelta(data.delta);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:8080/api/admin/overview/lecturers/monthly-delta", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.delta === "number") setLecturerDelta(data.delta);
        }
      } catch {}
    })();
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

  const onCardClick = (key: string) => {
    if (key === "students") router.push("/sinhvien_ad");
    if (key === "lecturers") router.push("/giangvien_ad");
    if (key === "classes") router.push("/lophoc_ad");
    if (key === "sessionsToday") router.push("/lichhoc_ad");
  };

  const donutStroke = 100; // circumference percentage base for SVG stroke-dasharray
  const cumulative = useMemo(() => {
    const arr: { start: number; len: number; color: string; label: string }[] = [];
    let acc = 0;
    for (const p of donutParts) {
      const ratio = Number.isFinite(p.value) ? Math.max(0, p.value) : 0;
      const len = Math.min(donutStroke, Math.max(0, ratio * donutStroke));
      arr.push({ start: acc, len, color: p.color, label: p.label });
      acc += len;
    }
    return arr;
  }, [donutParts]);

  const breakdownCounts = composition?.breakdown;

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className={`layout ${collapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="side-header">
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Mở rộng" : "Thu gọn"}>
            {collapsed ? "⮞" : "⮜"}
          </button>
          {!collapsed && <div className="side-name">Smart Attendance</div>}
        </div>
        <nav className="side-nav">
          <Link href="/tongquan_ad" className="side-link active" title="Dashboard">🏠 {!collapsed && "Dashboard"}</Link>
          <Link href="/thongbao_ad" className="side-link" title="Thông báo">📢 {!collapsed && "Thông báo"}</Link>
          <Link href="/sinhvien_ad" className="side-link" title="Sinh viên">👨‍🎓 {!collapsed && "Sinh viên"}</Link>
          <Link href="/giangvien_ad" className="side-link" title="Giảng viên">👩‍🏫 {!collapsed && "Giảng viên"}</Link>
          <Link href="/lophoc_ad" className="side-link" title="Lớp học">🏫 {!collapsed && "Lớp học"}</Link>
          <Link href="/lichhoc_ad" className="side-link" title="Lịch học">📅 {!collapsed && "Lịch học"}</Link>
          <Link href="/taikhoan_ad" className="side-link" title="Tài khoản">🔑 {!collapsed && "Tài khoản"}</Link>
          <Link href="/caidat_ad" className="side-link" title="Cấu hình">⚙️ {!collapsed && "Cấu hình"}</Link>
        </nav>
      </aside>

      <header className="topbar">
        <div className="top-left">
          <div className="page-title">📊 Tổng quan hệ thống</div>
        </div>
        <div className="controls">
          <div className="search">
            <i className="fas fa-search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm sinh viên, giảng viên, lớp…"
            />
          </div>
          <button
            className="qr-btn"
            onClick={async () => {
              if (confirm("Bạn có chắc muốn đăng xuất?")) {
                try {
                  await fetch("http://localhost:8080/api/auth/logout", { method: "POST", credentials: "include" });
                } catch {}
                try {
                  localStorage.removeItem("sas_user");
                } catch {}
                router.push("/login");
              }
            }}
          >
            🚪 Đăng xuất
          </button>
        </div>
      </header>

      <main className="main">{children}</main>
    </div>
  );

  return (
    <Shell>
      {/* A. Cards Row */}
      <section className="cards">
        <div className="card stat-card gradient-blue" onClick={() => onCardClick("students")}>
          <div className="card-top">👨‍🎓 Sinh viên</div>
          <div className="card-num">{(studentCount ?? stats.students.value).toLocaleString()}</div>
          <div className="card-sub">{typeof studentDelta === 'number' ? `${studentDelta >= 0 ? '+' : ''}${studentDelta.toLocaleString()} so với tháng trước` : stats.students.delta}</div>
          <div className="spark" aria-hidden>
            <svg width="120" height="36" viewBox="0 0 120 36">
              <polyline fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2" points="0,28 20,30 40,18 60,22 80,10 100,14 120,8" />
            </svg>
          </div>
        </div>
        <div className="card stat-card" onClick={() => onCardClick("lecturers")}>
          <div className="card-top">👩‍🏫 Giảng viên</div>
          <div className="card-num">{(lecturerCount ?? stats.lecturers.value).toLocaleString()}</div>
          <div className="card-sub">{typeof lecturerDelta === 'number' ? `${lecturerDelta >= 0 ? '+' : ''}${lecturerDelta.toLocaleString()} so với tháng trước` : ''}</div>
        </div>
        <div className="card stat-card" onClick={() => onCardClick("classes")}> 
          <div className="card-top">🏫 Lớp học</div>
          <div className="card-num">{(classCount ?? stats.classes.value).toLocaleString()}</div>
        </div>
        <div className="card stat-card" onClick={() => onCardClick("sessionsToday")}>
          <div className="card-top">📅 Buổi học hôm nay</div>
          <div className="card-num">{(sessionsTodayCount ?? stats.sessionsToday.value).toLocaleString()}</div>
        </div>
      </section>

      {/* B. Charts Row */}
      <section className="charts">
        <div className="panel composition-panel">
          <div className="panel-head">Tổng quan học kỳ</div>
          <div className="bar-wrap">
            {semesters.map((s, idx) => {
              const value = semesterBar[idx] ?? 0;
              const h = Math.max(6, Math.round((value / maxBar) * 180));
              const active = selectedSemester === s.code;
              return (
                <div
                  key={s.code}
                  className={`bar-col ${active ? "active" : ""}`}
                  onClick={async () => {
                    if (active) {
                      setSelectedSemester(null);
                      setSemesterDetail(null);
                      setSemesterDetailLoading(false);
                      return;
                    }
                    setSelectedSemester(s.code);
                    setSemesterDetail(null);
                    setSemesterDetailLoading(true);
                    try {
                      const res = await fetch(`http://localhost:8080/api/admin/overview/semesters/attendance/${s.code}`, {
                        credentials: "include",
                      });
                      if (res.ok) {
                        const data = await res.json();
                        if (data?.semester) {
                          setSemesterDetail({
                            code: String(data.semester.code ?? s.code),
                            name: String(data.semester.name ?? s.name),
                            totalStudents: Number(data.semester.totalStudents ?? data.semester.total_students ?? 0),
                            attendanceRatio: Number(data.semester.attendanceRatio ?? data.semester.attendance_ratio ?? 0),
                          });
                        } else {
                          setSemesterDetail(null);
                        }
                      } else {
                        setSemesterDetail(null);
                      }
                    } catch (err) {
                      console.error("semester detail fetch error", err);
                      setSemesterDetail(null);
                    } finally {
                      setSemesterDetailLoading(false);
                    }
                  }}
                  title={`${s.name}: ${(value * 100).toFixed(1)}%`}
                >
                  <div className="bar" style={{ height: h }} />
                  <div className="bar-x">{s.code}</div>
                </div>
              );
            })}
          </div>
          <div className="chart-note">
            {semesterLoading && <span>Đang tải dữ liệu học kỳ...</span>}
            {semesterError && !semesterLoading && <span className="error">{semesterError}</span>}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">Tỉ lệ thành phần</div>
          <div className="donut-wrap">
            <div className="donut-figure">
              <svg viewBox="0 0 36 36" className="donut">
                <circle className="donut-ring" cx="18" cy="18" r="15.915" fill="transparent" stroke="#e5e7eb" strokeWidth="3" />
                {cumulative.map((seg, i) => (
                  <circle key={i} cx="18" cy="18" r="15.915" fill="transparent" stroke={seg.color} strokeWidth="3" strokeDasharray={`${seg.len} ${donutStroke - seg.len}`} strokeDashoffset={-seg.start} />
                ))}
              </svg>
              <div className="donut-center">
                <div className="donut-total">Tổng</div>
                <div className="donut-number">{totalUsers.toLocaleString()} người</div>
              </div>
            </div>
            <div className="legend">
              {donutParts.map((p) => {
                const percent = Math.round((Number.isFinite(p.value) ? Math.max(0, p.value) : 0) * 100);
                const count = breakdownCounts?.[p.key as keyof CompositionBreakdown];
                return (
                  <div key={p.key} className="legend-item">
                    <span className="dot" style={{ background: p.color }} />
                    <div className="legend-text">
                      <div className="legend-line">
                        <span className="legend-label">{p.label}</span>
                        <span className="legend-percent">{percent}%</span>
                      </div>
                      {typeof count === 'number' && (
                        <div className="legend-count">{count.toLocaleString()} người</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {compositionLoading && <div className="legend-note">Đang cập nhật tỉ lệ thành phần...</div>}
              {compositionError && <div className="legend-note error">{compositionError}</div>}
            </div>
          </div>
        </div>
      </section>

      {/* C. Activity Log */}
      <section className="activity">
        <div className="panel">
          <div className="panel-head">Hoạt động gần đây</div>
          <div className="table">
            <div className="thead">
              <div>Thời gian</div>
              <div>Hành động</div>
              <div>Người thực hiện</div>
            </div>
            <div className="tbody">
              {activityLoading && <div className="trow">Đang tải hoạt động...</div>}
              {activityError && !activityLoading && <div className="trow error">{activityError}</div>}
              {!activityLoading && !activityError && activity.length === 0 && <div className="trow">Không có hoạt động gần đây</div>}
              {!activityLoading && !activityError &&
                activity.slice(0, 6).map((row) => (
                  <div className="trow" key={row.id} onClick={() => setModal(row)}>
                    <div>{row.time}</div>
                    <div>{row.action}</div>
                    <div>{row.actor}</div>
                  </div>
                ))}
            </div>
          </div>
          <div className="panel-foot">
            <button className="link-btn" onClick={() => setShowAllActivities(true)} disabled={activityLoading || (!!activityError && activity.length === 0)}>
              Xem tất cả
            </button>
          </div>
        </div>
      </section>

      {modal && (
        <div className="modal" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="title">Chi tiết hoạt động</div>
              <button className="icon-btn" onClick={() => setModal(null)}>✖</button>
            </div>
            <div className="modal-body">
              <div className="kv"><span className="k">Thời gian</span><span className="v">{modal.time}</span></div>
              <div className="kv"><span className="k">Hành động</span><span className="v">{modal.action}</span></div>
              <div className="kv"><span className="k">Người thực hiện</span><span className="v">{modal.actor}</span></div>
              {modal.detail && <div className="kv"><span className="k">Chi tiết</span><span className="v">{modal.detail}</span></div>}
            </div>
            <div className="modal-foot">
              <button className="qr-btn" onClick={() => setModal(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {selectedSemester && (
        <div className="modal" onClick={() => { setSelectedSemester(null); setSemesterDetail(null); setSemesterDetailLoading(false); }}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="title">Tổng quan {semesterDetail?.name || selectedSemester}</div>
              <button className="icon-btn" onClick={() => { setSelectedSemester(null); setSemesterDetail(null); setSemesterDetailLoading(false); }}>✖</button>
            </div>
            <div className="modal-body">
              <table className="semester-table">
                <thead>
                  <tr>
                    <th>Học kỳ</th>
                    <th>Tổng sinh viên</th>
                    <th>Tỉ lệ điểm danh</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterDetailLoading && (
                    <tr>
                      <td colSpan={3}>Đang tải dữ liệu...</td>
                    </tr>
                  )}
                  {!semesterDetailLoading && semesterDetail && (
                    <tr>
                      <td>{semesterDetail.code}</td>
                      <td>{semesterDetail.totalStudents.toLocaleString()}</td>
                      <td>{Math.round(semesterDetail.attendanceRatio * 100)}%</td>
                    </tr>
                  )}
                  {!semesterDetailLoading && !semesterDetail && (
                    <tr>
                      <td colSpan={3}>Không có dữ liệu cho học kỳ này</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="modal-foot">
              <button className="qr-btn" onClick={() => { setSelectedSemester(null); setSemesterDetail(null); setSemesterDetailLoading(false); }}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {showAllActivities && (
        <div className="modal" onClick={() => setShowAllActivities(false)}>
          <div className="modal-content wide" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="title">Toàn bộ hoạt động gần đây</div>
              <button className="icon-btn" onClick={() => setShowAllActivities(false)}>✖</button>
            </div>
            <div className="modal-body scroll">
              <table className="full-activity-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Hành động</th>
                    <th>Người thực hiện</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((row) => (
                    <tr key={row.id}>
                      <td>{row.time}</td>
                      <td>{row.action}</td>
                      <td>{row.actor}</td>
                      <td>{row.detail || "—"}</td>
                    </tr>
                  ))}
                  {!activityLoading && !activityError && activity.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center" }}>Không có hoạt động gần đây</td>
                    </tr>
                  )}
                  {activityError && (
                    <tr>
                      <td colSpan={4} style={{ color: "var(--danger, #dc2626)", textAlign: "center" }}>{activityError}</td>
                    </tr>
                  )}
                  {activityLoading && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center" }}>Đang tải...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="modal-foot">
              <button className="qr-btn" onClick={() => setShowAllActivities(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

