"use client";

import { useEffect, useRef } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

export default function QRCodeScanner({
  onResult,
}: {
  onResult: (text: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasResultRef = useRef(false);

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let controls: IScannerControls | undefined;

    hasResultRef.current = false;

    if (videoRef.current) {
      reader
        .decodeFromVideoDevice(undefined, videoRef.current, (result, err, ctrl) => {
          controls = ctrl;

          if (!result) {
            return;
          }

          if (hasResultRef.current) {
            return;
          }

          hasResultRef.current = true;
          try {
            onResult(result.getText());
          } finally {
            if (controls) {
              controls.stop();
            }
          }
        })
        .catch((err) => console.error("QR init error:", err));
    }

    return () => {
      if (controls) {
        controls.stop();
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
