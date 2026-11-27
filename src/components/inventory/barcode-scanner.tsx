"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBarcode, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { DecodeHintType as HintKey } from "@zxing/library";

export type ScanFeedback = { ok: boolean; message: string };

/** Same code read again within this window is ignored (the camera sees it for many frames). */
const REPEAT_MS = 1500;

/** Exact barcode match first, SKU as a fallback (labels often print the SKU as a code). */
export function findByBarcode<T extends { sku: string; barcode: string | null }>(items: T[], code: string): T | undefined {
  const c = code.trim().toLowerCase();
  if (!c) return undefined;
  return (
    items.find((p) => p.barcode?.trim().toLowerCase() === c) ?? items.find((p) => p.sku.trim().toLowerCase() === c)
  );
}

/**
 * A "สแกนบาร์โค้ด" button that opens the phone camera in a full-screen sheet and
 * reads barcodes continuously until "เสร็จสิ้น" -- so a whole shelf can be scanned
 * in one go. `onScan` handles each code and returns the message shown under the
 * camera (green = ok, orange = not found / can't add).
 *
 * Needs HTTPS (or localhost) for the camera; the reader (ZXing) is loaded only
 * when the sheet is opened.
 */
export function BarcodeScanButton({
  onScan,
  label = "สแกนบาร์โค้ด",
  className,
}: {
  onScan: (code: string) => ScanFeedback;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "flex items-center gap-2 rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50"
        }
      >
        <FontAwesomeIcon icon={faBarcode} />
        {label}
      </button>
      {open && <ScannerSheet onScan={onScan} onClose={() => setOpen(false)} />}
    </>
  );
}

function ScannerSheet({ onScan, onClose }: { onScan: (code: string) => ScanFeedback; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // the latest handler, so the camera isn't restarted whenever the form state changes
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });

  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);
  const [feedback, setFeedback] = useState<(ScanFeedback & { code: string; n: number }) | null>(null);

  useEffect(() => {
    let stopped = false;
    let controls: { stop: () => void } | undefined;
    let last = { code: "", at: 0 };
    let n = 0;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("เบราว์เซอร์นี้เปิดกล้องไม่ได้ — ต้องเปิดผ่าน HTTPS และใช้เบราว์เซอร์รุ่นใหม่");
        setStarting(false);
        return;
      }
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        if (stopped) return;
        const hints = new Map<HintKey, unknown>([
          [
            DecodeHintType.POSSIBLE_FORMATS,
            [
              BarcodeFormat.EAN_13,
              BarcodeFormat.EAN_8,
              BarcodeFormat.UPC_A,
              BarcodeFormat.UPC_E,
              BarcodeFormat.CODE_128,
              BarcodeFormat.CODE_39,
              BarcodeFormat.ITF,
              BarcodeFormat.QR_CODE,
            ],
          ],
          [DecodeHintType.TRY_HARDER, true],
        ]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 80 });
        const c = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoRef.current ?? undefined,
          (result) => {
            if (!result || stopped) return;
            const code = result.getText();
            const now = Date.now();
            if (code === last.code && now - last.at < REPEAT_MS) return;
            last = { code, at: now };
            try {
              navigator.vibrate?.(60);
            } catch {
              /* not supported */
            }
            setFeedback({ ...onScanRef.current(code), code, n: ++n });
          },
        );
        if (stopped) c.stop();
        else controls = c;
        setStarting(false);
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        setError(
          name === "NotAllowedError"
            ? "ไม่ได้อนุญาตให้ใช้กล้อง — เปิดสิทธิ์กล้องให้เว็บไซต์นี้ในการตั้งค่าเบราว์เซอร์ แล้วลองใหม่"
            : name === "NotFoundError"
              ? "ไม่พบกล้องในอุปกรณ์นี้"
              : "เปิดกล้องไม่สำเร็จ — ลองปิดแอปอื่นที่ใช้กล้องอยู่ แล้วลองใหม่",
        );
        setStarting(false);
      }
    })();

    return () => {
      stopped = true;
      controls?.stop();
    };
  }, []);

  // Esc closes the sheet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="สแกนบาร์โค้ด" className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="font-medium">สแกนบาร์โค้ด</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดกล้อง"
          className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        {!error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-[80%] max-w-md rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
        )}
        {starting && !error && (
          <p className="absolute inset-x-0 top-6 text-center text-sm text-white/80">กำลังเปิดกล้อง…</p>
        )}
        {error && <p className="absolute inset-x-4 top-6 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700">{error}</p>}
      </div>

      <div className="space-y-3 bg-black px-4 pb-6 pt-4">
        <p
          aria-live="polite"
          className={`min-h-12 rounded-lg px-3 py-2 text-sm ${
            feedback
              ? feedback.ok
                ? "bg-emerald-50 text-emerald-700"
                : "bg-orange-50 text-orange-700"
              : "text-white/70"
          }`}
        >
          {feedback ? (
            <>
              <span className="font-medium">{feedback.code}</span> — {feedback.message}
            </>
          ) : (
            "เล็งบาร์โค้ดให้อยู่ในกรอบ — สแกนต่อเนื่องได้หลายชิ้น"
          )}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-teal-800 hover:bg-teal-50"
        >
          เสร็จสิ้น
        </button>
      </div>
    </div>
  );
}
