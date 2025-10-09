"use client";

import Link from "next/link";
import QRButton from "@/app/components/QRButton";

export default function LichSuPage() {
  return (
    <div>
      {/* Header với user info và QR button */}
      <div className="user-qr">
        <div className="user">
          <img src="/avatar.png" alt="avatar" />
          <div className="name">Nguyen Van A</div>
        </div>
        <QRButton />
      </div>

      {/* Navigation bar */}
      <div className="header-bottom">
        <Link href="/thongbao_sv" className="tab">Thông báo</Link>
        <Link href="/lichhoc_sv" className="tab">Lịch học</Link>
        <div className="tab active">Lịch sử</div>
      </div>

      {/* Main content - Bảng lịch sử */}
      <div className="container">
        <div className="card">
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
              <tr>
                <td>Nguyen Van A - SV001</td>
                <td>PRN 212</td>
                <td>Phong</td>
                <td>8/10/2025 - slot 2</td>
                <td>CT08</td>
                <td>
                  <span className="status-badge attended">Đã điểm danh</span>
                </td>
              </tr>
              <tr>
                <td>Nguyen Van A - SV001</td>
                <td>SWT 301</td>
                <td>Vinh</td>
                <td>8/10/2025 - slot 1</td>
                <td>CT01</td>
                <td>
                  <span className="status-badge attended">Đã điểm danh</span>
                </td>
              </tr>
              <tr>
                <td>Nguyen Van A - SV001</td>
                <td>SWP391</td>
                <td>Phuc</td>
                <td>7/10/2025 - slot 1</td>
                <td>CT13</td>
                <td>
                  <span className="status-badge absent">Vắng</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
