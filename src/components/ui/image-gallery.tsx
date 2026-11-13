"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUpRightFromSquare,
  faChevronLeft,
  faChevronRight,
  faExpand,
  faFilePdf,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { DeleteButton } from "@/components/ui/delete-button";

export type GalleryImage = {
  id: string;
  fileName: string | null;
  /** "application/pdf" shows a PDF tile and opens the document in the viewer */
  mimeType?: string;
  thumbUrl: string | null;
  fullUrl: string | null;
};

/**
 * Small previews of attached photos/PDFs with a "ดูภาพเต็ม" button that opens
 * the full image (or the PDF) in a viewer (←/→ to move between files, Esc to
 * close).
 *
 * `compact` shows just the first preview with a +N count (for table rows).
 * `onDelete`, when given, adds a remove button under each preview.
 */
export function ImageGallery({
  images,
  compact = false,
  onDelete,
}: {
  images: GalleryImage[];
  compact?: boolean;
  onDelete?: (id: string) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);

  const open = (i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();
  const step = useCallback(
    (delta: number) => setIndex((i) => (i === null ? i : (i + delta + images.length) % images.length)),
    [images.length]
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, step]);

  if (images.length === 0) return null;
  const current = index === null ? null : images[index];

  return (
    <>
      {compact ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => open(0)} className="relative shrink-0" title="ดูภาพเต็ม">
            <Thumb image={images[0]} className="h-10 w-10" />
            {images.length > 1 && (
              <span className="absolute -right-1.5 -top-1.5 rounded-full bg-teal-700 px-1.5 text-[10px] font-semibold leading-4 text-white">
                {images.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => open(0)}
            className="whitespace-nowrap text-xs font-medium text-teal-700 hover:text-orange-600"
          >
            {images.length === 1 && isPdf(images[0]) ? "ดู PDF" : "ดูภาพเต็ม"}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {images.map((image, i) => (
            <div key={image.id} className="flex w-24 flex-col items-center gap-1.5">
              <button type="button" onClick={() => open(i)} title="ดูภาพเต็ม">
                <Thumb image={image} className="h-24 w-24" />
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => open(i)}
                  className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-teal-700 hover:text-orange-600"
                >
                  <FontAwesomeIcon icon={isPdf(image) ? faFilePdf : faExpand} />
                  {isPdf(image) ? "ดู PDF" : "ดูภาพเต็ม"}
                </button>
                {onDelete && (
                  <DeleteButton action={() => onDelete(image.id)} confirmMessage="ลบรูปนี้?" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setIndex(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) close(); // click on the dark backdrop
        }}
        className="m-auto max-h-[95vh] max-w-[95vw] overflow-visible bg-transparent p-0 backdrop:bg-black/80"
      >
        {current && (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {current.fullUrl && isPdf(current) ? (
                <iframe
                  src={current.fullUrl}
                  title={current.fileName ?? "PDF"}
                  className="h-[82vh] w-[92vw] max-w-5xl rounded-lg bg-white shadow-2xl"
                />
              ) : current.fullUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed Storage URL
                <img
                  src={current.fullUrl}
                  alt={current.fileName ?? "รูปแนบ"}
                  className="max-h-[82vh] max-w-[92vw] rounded-lg bg-white object-contain shadow-2xl"
                />
              ) : (
                <p className="rounded-lg bg-white px-6 py-10 text-sm text-teal-700">โหลดรูปไม่สำเร็จ</p>
              )}
              {images.length > 1 && !isPdf(current) && (
                <>
                  <NavButton side="left" onClick={() => step(-1)} />
                  <NavButton side="right" onClick={() => step(1)} />
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-white">
              {images.length > 1 && (
                <span className="flex items-center gap-2">
                  {isPdf(current) && (
                    <button type="button" onClick={() => step(-1)} aria-label="ไฟล์ก่อนหน้า" className="rounded-full bg-white/15 px-2 py-1 hover:bg-white/25">
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                  )}
                  {index! + 1} / {images.length}
                  {isPdf(current) && (
                    <button type="button" onClick={() => step(1)} aria-label="ไฟล์ถัดไป" className="rounded-full bg-white/15 px-2 py-1 hover:bg-white/25">
                      <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                  )}
                </span>
              )}
              {current.fileName && <span className="max-w-60 truncate text-white/80">{current.fileName}</span>}
              {current.fullUrl && (
                <a
                  href={current.fullUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 hover:bg-white/25"
                >
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                  เปิดในแท็บใหม่
                </a>
              )}
              <button
                type="button"
                onClick={close}
                className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 hover:bg-white/25"
              >
                <FontAwesomeIcon icon={faXmark} />
                ปิด
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

function isPdf(image: GalleryImage) {
  return image.mimeType === "application/pdf";
}

function Thumb({ image, className }: { image: GalleryImage; className: string }) {
  if (isPdf(image) && image.thumbUrl) {
    return (
      <span className="relative block">
        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed Storage URL */}
        <img
          src={image.thumbUrl}
          alt={image.fileName ?? "PDF"}
          loading="lazy"
          className={`${className} rounded-lg border border-teal-200 bg-white object-cover object-top transition-opacity hover:opacity-80`}
        />
        <span className="absolute bottom-1 left-1 rounded bg-rose-600 px-1 text-[9px] font-bold leading-4 text-white">
          PDF
        </span>
      </span>
    );
  }
  if (isPdf(image)) {
    return (
      <span
        className={`${className} flex flex-col items-center justify-center gap-0.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition-opacity hover:opacity-80`}
        title={image.fileName ?? "PDF"}
      >
        <FontAwesomeIcon icon={faFilePdf} className="text-xl" />
        <span className="text-[10px] font-semibold">PDF</span>
      </span>
    );
  }
  return image.thumbUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed Storage URL
    <img
      src={image.thumbUrl}
      alt={image.fileName ?? "รูปแนบ"}
      loading="lazy"
      className={`${className} rounded-lg border border-teal-200 bg-teal-50 object-cover transition-opacity hover:opacity-80`}
    />
  ) : (
    <span className={`${className} flex items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-[10px] text-teal-500`}>
      ไม่มีรูป
    </span>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "รูปก่อนหน้า" : "รูปถัดไป"}
      className={`absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 ${
        side === "left" ? "left-2" : "right-2"
      }`}
    >
      <FontAwesomeIcon icon={side === "left" ? faChevronLeft : faChevronRight} />
    </button>
  );
}
