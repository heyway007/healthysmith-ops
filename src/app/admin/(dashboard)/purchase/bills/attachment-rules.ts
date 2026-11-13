// Limits for purchase attachments (photos and PDFs), shared by the browser
// picker and the server.
//
// Photos: phone photos are usually 2-6 MB. The picker accepts originals up to
// 15 MB, then shrinks them in the browser (longest side 2000px, JPEG) to about
// 0.3-1 MB -- still sharp enough to read a receipt -- plus a ~20 KB preview.
//
// PDFs (e-Tax invoices, scans) are uploaded as they are, so they get their own
// cap: 5 MB covers a multi-page scan; e-Tax PDFs are usually under 200 KB.

export const MAX_ATTACHMENTS = 5;
export const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;
/** Upper bound for a stored (already resized) photo. */
export const MAX_STORED_BYTES = 3 * 1024 * 1024;
export const MAX_PDF_BYTES = 5 * 1024 * 1024;
export const MAX_THUMB_BYTES = 300 * 1024;
export const FULL_MAX_SIDE = 2000;
export const THUMB_MAX_SIDE = 320;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PDF_TYPE = "application/pdf";

export const ATTACHMENT_BUCKET = "purchase-attachments";
