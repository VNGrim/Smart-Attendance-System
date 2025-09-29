"use client";

import Link from "next/link";
import QRButton from "@/app/components/QRButton";

export default function ThongBaoPage() {
  return (
    <div>
      <div className="user-qr">
        <div className="user">
          <img src="/avatar.png" alt="avatar" />
          <div className="name">Nguyen Van A</div>
        </div>
        <QRButton />
      </div>

      <div className="header-bottom">
        <div className="tab active">Thông báo</div>
        <Link href="/lichhoc_sv" className="tab">Lịch học</Link>
        <div className="tab">Lịch sử</div>
      </div>

      <div className="container">
        <div className="card">
          <ul className="notifications">
            <li>
              <div className="notif-time">08/09/25 18:08</div>
              <div className="notif-body">
                [KHẢO THÍ] THÔNG BÁO KẾT QUẢ OJT202, OJB202 KỲ SUMMER 2025
              </div>
            </li>
            <li>
              <div className="notif-time">08/09/25 16:39</div>
              <div className="notif-body">
                Đăng ký học chương trình Kỹ sư 57 (KS57) dành cho sinh viên ngành Công nghệ thông tin
              </div>
            </li>
            <li>
              <div className="notif-time">06/09/25 12:38</div>
              <div className="notif-body">
                [KHẢO THÍ] THÔNG BÁO KẾT QUẢ BẢO VỆ LẦN 1 ĐỒ ÁN TỐT NGHIỆP KỲ SUMMER 2025
              </div>
            </li>
            <li>
              <div className="notif-time">05/09/25 11:36</div>
              <div className="notif-body">
                [KHẢO THÍ] THÔNG BÁO KẾT QUẢ THI RETAKE CÁC MÔN TADB H2 & BL3W KỲ SUMMER 2025
              </div>
            </li>
            <li>
              <div className="notif-time">03/09/25 17:16</div>
              <div className="notif-body">
                [KHẢO THÍ] THÔNG BÁO KẾT QUẢ MÔN LAB211 KỲ SUMMER 2025
              </div>
            </li>
            <li>
              <div className="notif-time">01/09/25 23:08</div>
              <div className="notif-body">
                [KHẢO THÍ] THÔNG BÁO Lịch thi Retake TADB_H2 & BL3W 03/09/2025_SUMMER 2025
              </div>
            </li>
            <li>
              <div className="notif-time">01/09/25 15:40</div>
              <div className="notif-body">
                [KHẢO THÍ] THÔNG BÁO KẾT QUẢ THI FINAL CÁC MÔN TADB H2 & BL3W KỲ SUMMER 2025
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
