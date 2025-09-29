"use client";

import QRButton from "../components/QRButton";

export default function ThongBaoPage() {
  const notifications = [
    { date: "01/09/2025 18:07", text: "[THÔNG TIN] THÔNG BÁO LỊCH HỌC KỲ SUMMER 2025" },
    { date: "01/09/2025 17:55", text: "[THÔNG TIN] DANH SÁCH PHÒNG THI CUỐI KỲ" },
    { date: "01/09/2025 17:30", text: "[THÔNG TIN] THỜI KHÓA BIỂU KỲ SUMMER 2025" },
    { date: "01/09/2025 17:10", text: "[THÔNG TIN] THÔNG BÁO LỊCH NGHỈ 02/09/2025" },
  ];

  return (
    <div>
      {/* TOP: avatar + QR */}
      <div className="header-top">
        <div className="user">
          <img src="/avatar.png" alt="avatar" />
          <div className="name">Nguyen Van A</div>
        </div>
        <QRButton />
      </div>

      {/* BOTTOM: thanh tab màu xanh */}
      <div className="header-bottom">
        <div className="tab active">
          <i className="fas fa-bell"></i>
          <span>Thông báo</span>
        </div>
        <div className="tab">
          <i className="fas fa-calendar"></i>
          <span>Lịch học</span>
        </div>
        <div className="tab">
          <i className="fas fa-history"></i>
          <span>Lịch sử</span>
        </div>
      </div>

      {/* BODY */}
      <main className="container">
        <section className="card">
          <ul className="notifications">
            {notifications.map((n, idx) => (
              <li key={idx}>
                <div className="notif-time">{n.date}</div>
                <div className="notif-body">{n.text}</div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
