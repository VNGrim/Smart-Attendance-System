"use client";

import { useEffect, useRef } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

export default function QRCodeScanner({
  onResult,
}: {
  onResult: (text: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let controls: IScannerControls | undefined;

    if (videoRef.current) {
      reader
        .decodeFromVideoDevice(undefined, videoRef.current, (result, err, ctrl) => {
          controls = ctrl; // ✅ giữ lại controls để dừng
          if (result) {
            onResult(result.getText());
          }
        })
        .catch((err) => console.error("QR init error:", err));
    }

    return () => {
      if (controls) {
        controls.stop(); // ✅ cách chính thức để dừng camera
      }
    };
  }, [onResult]);

  return (
    <video
      ref={videoRef}
      style={{ width: "100%", borderRadius: "12px" }}
    />
  );
}
