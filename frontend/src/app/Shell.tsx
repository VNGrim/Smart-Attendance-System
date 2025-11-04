'use client';

import Link from "next/link";
import type { ReactNode } from "react";

export interface ShellProps {
  collapsed: boolean;
  setCollapsed(value: boolean): void;
  dark: boolean;
  toggleDark(): void;
  notifCount?: number;
  tab?: string;
  setTab?(value: string): void;
  children: ReactNode;
}

export function Shell({
  collapsed,
  setCollapsed,
  dark,
  toggleDark,
  notifCount = 0,
  tab,
  setTab,
  children,
}: ShellProps) {
  return (
    <div className={`layout ${collapsed ? "collapsed" : ""} ${dark ? "" : "light-theme"}`}>
      <aside className="sidebar">
        <div className="logo">SAS</div>
        <nav className="nav">
          <Link href="/tongquan_gv" className="nav-item">
            Tổng quan
          </Link>
          <Link href="/lophoc_gv" className="nav-item">
            Lớp học
          </Link>
          <Link href="/lichday_gv" className="nav-item">
            Lịch dạy
          </Link>
          <Link href="/thongbao_gv" className={`nav-item ${tab === "inbox" ? "active" : ""}`}>
            Thông báo
            {notifCount > 0 ? <span className="badge">{notifCount}</span> : null}
          </Link>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "☰" : "✕"}
          </button>
          <div className="actions">
            <button className="icon-btn" onClick={toggleDark}>
              {dark ? "🌙" : "☀️"}
            </button>
          </div>
        </header>

        <div className="content">
          {typeof tab !== "undefined" && setTab ? (
            <div className="tabs">
              <button className={`tab ${tab === "inbox" ? "active" : ""}`} onClick={() => setTab("inbox")}>
                Hộp thư đến
              </button>
              <button className={`tab ${tab === "send" ? "active" : ""}`} onClick={() => setTab("send")}>
                Đã gửi
              </button>
            </div>
          ) : null}

          {children}
        </div>
      </div>
    </div>
  );
}
