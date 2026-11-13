"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf, faPaperclip, faSpinner, faXmark } from "@fortawesome/free-solid-svg-icons";

/** PDFs are sent as-is; their `thumb`/`preview` is a picture of page 1, or
 * null (shown as a PDF tile) when that page can't be drawn. */
type Picked = { key: string; full: File; thumb: File | null; preview: string | null; name: string };

const PDF = "application/pdf";

type Props = {
  /** how many photos the record may hold in total */
  maxFiles: number;
  /** photos already saved on the record (count toward maxFiles) */
  existingCount?: number;
  maxOriginalBytes: number;
  maxStoredBytes: number;
  /** when set, PDF files are accepted too (uploaded unchanged, up to this size) */
  maxPdfBytes?: number;
  fullMaxSide: number;
  thumbMaxSide: number;
  /** form field names the server reads; files and previews are sent in the same order */
  fileName?: string;
  thumbName?: string;
  nameName?: string;
  /** hidden field with how many files were picked, so the server can tell if any went missing */
  countName?: string;
};

/** Provide `true` around a picker to make at least one file (saved or newly
 * picked) required before the form can be submitted. */
export const AttachmentRequiredContext = createContext(false);

// keys only need to be unique on this page (crypto's randomUUID exists only on https/localhost)
let nextKey = 0;
const newKey = () => `picked-${++nextKey}`;

const mb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void }> {
  try {
    // honours the EXIF rotation of phone photos
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, done: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  }
}

/** Draws page 1 of a PDF with pdf.js (loaded only when a PDF is picked; its
 * worker is served from /pdf.worker.min.mjs -- see scripts/copy-pdf-worker.mjs).
 * Returns null if the page can't be drawn, e.g. a password-protected file. */
async function renderPdfFirstPage(file: File, maxSide: number): Promise<HTMLCanvasElement | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    try {
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: maxSide / Math.max(base.width, base.height) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      return canvas;
    } finally {
      await doc.destroy();
    }
  } catch (err) {
    console.warn("[attachments] could not draw PDF preview", err);
    return null;
  }
}

/** Draws the image at most `maxSide` px on its longest side and encodes it as
 * JPEG, lowering the quality until it fits in `maxBytes`. */
async function toJpeg(
  image: { source: CanvasImageSource; width: number; height: number },
  maxSide: number,
  quality: number,
  maxBytes: number
): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#ffffff"; // transparent PNG areas would turn black in JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image.source, 0, 0, canvas.width, canvas.height);

  let q = quality;
  for (;;) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", q));
    if (!blob) throw new Error("encode failed");
    if (blob.size <= maxBytes || q <= 0.5) return blob;
    q -= 0.1;
  }
}

/**
 * Optional photo picker for a server-action form. Photos are shrunk in the
 * browser before upload (full image + small preview), then handed to the form
 * through hidden file inputs, so the server only ever receives small JPEGs.
 */
export function ImageAttachInput({
  maxFiles,
  existingCount = 0,
  maxOriginalBytes,
  maxStoredBytes,
  maxPdfBytes,
  fullMaxSide,
  thumbMaxSide,
  fileName = "attachment_files",
  thumbName = "attachment_thumbs",
  nameName = "attachment_names",
  countName = "attachment_count",
}: Props) {
  const [items, setItems] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const pickerRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const thumbsRef = useRef<HTMLInputElement>(null);
  const guardRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const room = Math.max(0, maxFiles - existingCount - items.length);

  // Hand the current selection to the form.
  useEffect(() => {
    const full = new DataTransfer();
    const thumbs = new DataTransfer();
    for (const item of items) {
      full.items.add(item.full);
      // one preview slot per file keeps the two lists in step; PDFs get an empty placeholder
      thumbs.items.add(item.thumb ?? new File([], "none", { type: "application/octet-stream" }));
    }
    if (filesRef.current) filesRef.current.files = full.files;
    if (thumbsRef.current) thumbsRef.current.files = thumbs.files;
  }, [items]);

  // Block submitting while photos are still being shrunk, or with no file when one is required.
  const required = useContext(AttachmentRequiredContext);
  const missing = required && existingCount + items.length === 0;
  useEffect(() => {
    guardRef.current?.setCustomValidity(
      busy > 0
        ? "กำลังเตรียมไฟล์ รอสักครู่แล้วกดบันทึกอีกครั้ง"
        : missing
          ? "กรุณาแนบรูปหรือ PDF อย่างน้อย 1 ไฟล์"
          : ""
    );
  }, [busy, missing]);

  // Free the preview URLs when leaving the page.
  useEffect(
    () => () => itemsRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview)),
    []
  );

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow picking the same file again later
    if (chosen.length === 0) return;

    const problems: string[] = [];
    const accepted = chosen.slice(0, room);
    if (chosen.length > room) problems.push(`แนบได้ไม่เกิน ${maxFiles} ไฟล์ — ข้ามไป ${chosen.length - room} ไฟล์`);

    setBusy((n) => n + accepted.length);
    for (const file of accepted) {
      try {
        if (file.type === PDF && maxPdfBytes) {
          if (file.size > maxPdfBytes) throw new Error(`PDF "${file.name}" ใหญ่เกิน ${mb(maxPdfBytes)}`);
          // drawn at twice the preview size, then shrunk, so small text stays crisp
          const page = await renderPdfFirstPage(file, thumbMaxSide * 2);
          let thumb: File | null = null;
          if (page) {
            const blob = await toJpeg({ source: page, width: page.width, height: page.height }, thumbMaxSide, 0.8, 250 * 1024);
            thumb = new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "document"}_thumb.jpg`, { type: "image/jpeg" });
          }
          const preview = thumb ? URL.createObjectURL(thumb) : null;
          setItems((prev) => [...prev, { key: newKey(), full: file, thumb, preview, name: file.name }]);
          continue;
        }
        if (!file.type.startsWith("image/")) {
          throw new Error(`"${file.name}" ไม่ใช่ไฟล์รูปภาพ${maxPdfBytes ? "หรือ PDF" : ""}`);
        }
        if (file.size > maxOriginalBytes) {
          throw new Error(`"${file.name}" ใหญ่เกิน ${mb(maxOriginalBytes)}`);
        }
        let image;
        try {
          image = await decode(file);
        } catch {
          throw new Error(`เปิดรูป "${file.name}" ไม่ได้ (รองรับ JPG, PNG, WebP)`);
        }
        try {
          const fullBlob = await toJpeg(image, fullMaxSide, 0.85, maxStoredBytes * 0.8);
          const thumbBlob = await toJpeg(image, thumbMaxSide, 0.75, 250 * 1024);
          const base = file.name.replace(/\.[^.]+$/, "") || "photo";
          const full = new File([fullBlob], `${base}.jpg`, { type: "image/jpeg" });
          const thumb = new File([thumbBlob], `${base}_thumb.jpg`, { type: "image/jpeg" });
          const preview = URL.createObjectURL(thumb);
          setItems((prev) => [...prev, { key: newKey(), full, thumb, preview, name: file.name }]);
        } finally {
          image.done();
        }
      } catch (err) {
        problems.push(err instanceof Error ? err.message : `แนบ "${file.name}" ไม่สำเร็จ`);
      } finally {
        setBusy((n) => n - 1);
      }
    }
    setErrors(problems);
  }

  function remove(key: string) {
    setItems((prev) => {
      const gone = prev.find((i) => i.key === key);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return prev.filter((i) => i.key !== key);
    });
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-start gap-3">
        {items.map((item) => (
          <div key={item.key} className="relative">
            {item.preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview (blob: URL) */}
                <img
                  src={item.preview}
                  alt={item.name}
                  className="h-20 w-20 rounded-lg border border-teal-200 bg-white object-cover object-top"
                />
                {item.full.type === PDF && <PdfBadge />}
              </>
            ) : (
              <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-1 text-rose-600">
                <FontAwesomeIcon icon={faFilePdf} className="text-2xl" />
                <span className="w-full truncate text-center text-[10px]" title={item.name}>
                  {item.name}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => remove(item.key)}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-orange-200 bg-white text-xs text-orange-500 shadow-sm hover:bg-orange-50 hover:text-orange-700"
              title="เอาไฟล์นี้ออก"
              aria-label={`เอา ${item.name} ออก`}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ))}
        {busy > 0 && (
          <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-teal-300 text-xs text-teal-600">
            <FontAwesomeIcon icon={faSpinner} spin />
            กำลังเตรียม
          </div>
        )}
        {room > 0 && (
          <button
            type="button"
            onClick={() => pickerRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-teal-300 bg-white text-xs text-teal-700 transition-colors hover:border-teal-500 hover:bg-teal-50"
          >
            <FontAwesomeIcon icon={faPaperclip} className="text-base" />
            {maxPdfBytes ? "เพิ่มไฟล์" : "เพิ่มรูป"}
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-teal-500">
        ไม่บังคับ · สูงสุด {maxFiles} ไฟล์ · รูป (JPG, PNG, WebP) ไม่เกิน {mb(maxOriginalBytes)} ระบบย่อให้อัตโนมัติ
        {maxPdfBytes ? ` · PDF ไม่เกิน ${mb(maxPdfBytes)}` : ""}
      </p>
      {errors.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-orange-600">
          {errors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}

      {/* what the user picks -- not submitted itself */}
      <input
        ref={pickerRef}
        type="file"
        accept={maxPdfBytes ? "image/*,application/pdf" : "image/*"}
        multiple
        className="hidden"
        onChange={handlePick}
      />
      {/* what the form submits: the shrunk files, previews, and original names */}
      <input ref={filesRef} type="file" name={fileName} multiple hidden />
      <input ref={thumbsRef} type="file" name={thumbName} multiple hidden />
      {items.map((item) => (
        <input key={item.key} type="hidden" name={nameName} value={item.name} />
      ))}
      <input type="hidden" name={countName} value={items.length} />
      <input
        ref={guardRef}
        tabIndex={-1}
        aria-hidden="true"
        value=""
        onChange={() => {}}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />
    </div>
  );
}

function PdfBadge() {
  return (
    <span className="absolute bottom-1 left-1 rounded bg-rose-600 px-1 text-[9px] font-bold leading-4 text-white">PDF</span>
  );
}
