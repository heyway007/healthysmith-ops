"use client";

import { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage, faTrash } from "@fortawesome/free-solid-svg-icons";
import {
  LOGO_ACCEPT,
  LOGO_HINT,
  LOGO_MAX_BYTES,
  LOGO_MAX_RATIO,
  LOGO_MAX_SIDE_PX,
  LOGO_TYPES,
} from "@/lib/company-logo-rules";

function readSize(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("อ่านไฟล์รูปไม่ได้"));
    img.src = url;
  });
}

/**
 * Logo picker for a server-action form: posts the chosen file as `logo_file`
 * and, when the current logo is being removed, `remove_logo=1`. Checks the
 * size / ratio limits in the browser so a bad file is rejected immediately.
 */
export function LogoUploadInput({ currentUrl }: { currentUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearPick() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p);
      return null;
    });
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return clearPick();

    const reject = (message: string) => {
      clearPick();
      setError(message);
    };
    if (!LOGO_TYPES.includes(file.type)) return reject("ใช้ได้เฉพาะไฟล์ JPG, PNG หรือ WebP");
    if (file.size > LOGO_MAX_BYTES) {
      return reject(`ไฟล์ใหญ่เกินไป (${(file.size / 1024 / 1024).toFixed(1)} MB) — ต้องไม่เกิน ${LOGO_MAX_BYTES / 1024 / 1024} MB`);
    }

    const url = URL.createObjectURL(file);
    try {
      const { width, height } = await readSize(url);
      if (Math.max(width, height) > LOGO_MAX_SIDE_PX) {
        URL.revokeObjectURL(url);
        return reject(`รูปใหญ่เกินไป (${width}×${height} พิกเซล) — ด้านที่ยาวที่สุดต้องไม่เกิน ${LOGO_MAX_SIDE_PX} พิกเซล`);
      }
      if (Math.max(width, height) / Math.min(width, height) > LOGO_MAX_RATIO) {
        URL.revokeObjectURL(url);
        return reject(`สัดส่วนรูปเกินกำหนด (${width}×${height}) — กว้าง:สูงต้องไม่เกิน ${LOGO_MAX_RATIO}:1`);
      }
    } catch (err) {
      URL.revokeObjectURL(url);
      return reject(err instanceof Error ? err.message : "อ่านไฟล์รูปไม่ได้");
    }
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p);
      return url;
    });
    setRemove(false);
  }

  const shown = remove ? null : (preview ?? currentUrl);

  return (
    <div>
      <span className="block text-sm font-medium text-teal-800">โลโก้บริษัท (ถ้ามี)</span>
      <div className="mt-1 flex flex-wrap items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-teal-300 bg-white p-1">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="โลโก้บริษัท" className="max-h-full max-w-full object-contain" />
          ) : (
            <FontAwesomeIcon icon={faImage} className="text-2xl text-teal-300" />
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <input
            ref={inputRef}
            id="logo_file"
            name="logo_file"
            type="file"
            accept={LOGO_ACCEPT}
            onChange={onChange}
            className="block text-sm text-teal-800 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-teal-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-teal-700 hover:file:bg-teal-50"
          />
          {currentUrl && !preview && (
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-rose-600">
              <input
                type="checkbox"
                name="remove_logo"
                value="1"
                checked={remove}
                onChange={(e) => setRemove(e.target.checked)}
              />
              <FontAwesomeIcon icon={faTrash} className="text-xs" />
              ลบโลโก้ปัจจุบัน
            </label>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-orange-600">{error}</p>}
      <p className="mt-2 text-xs text-teal-600">{LOGO_HINT}</p>
    </div>
  );
}
