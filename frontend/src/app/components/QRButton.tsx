"use client";

import { useState } from "react";
import QRCodeScanner from "./QRCodeScanner";

export default function QRButton() {
  const [open, setOpen] = useState(false);
  const [scanResult, setScanResult] = useState("");

  return (
    <div>
      {/* Nút QR */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "6px 12px",
          cursor: "pointer",
        }}
      >
        <i className="fas fa-qrcode"></i>
        <span>Quét QR</span>
      </button>

      {/* Modal Scanner */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              maxWidth: "420px",
              width: "100%",
            }}
          >
            <h3>Quét mã QR</h3>
            <QRCodeScanner onResult={(text) => setScanResult(text)} />
            {scanResult && (
              <p style={{ marginTop: "10px" }}>
                <strong>Kết quả:</strong> {scanResult}
              </p>
            )}

            <button
              onClick={() => setOpen(false)}
              style={{
                marginTop: "10px",
                background: "#49998A",
                color: "#fff",
                padding: "8px 12px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
