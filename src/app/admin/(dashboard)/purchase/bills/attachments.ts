// Server-side helpers for purchase photos (not a "use server" file: these are
// called from the bill actions/pages, never directly from the browser).
//
// Storage calls use the service-role client, so every helper is only reached
// after a query made with the user's own client (RLS) has shown they can see
// the purchase in question.

import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import {
  ATTACHMENT_BUCKET,
  IMAGE_TYPES,
  MAX_ATTACHMENTS,
  MAX_PDF_BYTES,
  MAX_STORED_BYTES,
  MAX_THUMB_BYTES,
  PDF_TYPE,
} from "./attachment-rules";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type AttachmentView = {
  id: string;
  fileName: string | null;
  mimeType: string;
  thumbUrl: string | null;
  fullUrl: string | null;
};

/** The picked files from the form, each with its preview (photos) and
 * original name. The picker sends one preview slot per file, in the same
 * order; PDFs fill theirs with an empty placeholder. */
export function attachmentFilesFromForm(formData: FormData) {
  const isFile = (v: FormDataEntryValue): v is File => typeof v !== "string";
  // an empty file input still submits one blank entry -- drop it
  const files = formData.getAll("attachment_files").filter(isFile).filter((f) => f.size > 0);
  const thumbs = formData.getAll("attachment_thumbs").filter(isFile);
  const names = formData.getAll("attachment_names").map(String);
  const expected = Number(formData.get("attachment_count") ?? 0);
  if (expected > files.length) {
    throw new Error(
      `ได้รับไฟล์แนบ ${files.length} จาก ${expected} ไฟล์ — กรุณาแนบไฟล์ใหม่แล้วกดบันทึกอีกครั้ง`
    );
  }
  return files.map((file, i) => {
    const thumb = thumbs[i];
    return { file, thumb: thumb && thumb.size > 0 ? thumb : null, name: names[i] || file.name || null };
  });
}

async function isRealPdf(file: File) {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...head) === "%PDF-";
}

/** Uploads the new photos for a purchase and records them. Throws (after
 * removing anything it already uploaded) if a file breaks the rules. */
export async function saveAttachments(
  supabase: SupabaseClient,
  billId: string,
  picked: ReturnType<typeof attachmentFilesFromForm>,
  createdBy: string | null
) {
  if (picked.length === 0) return;

  const { count } = await supabase
    .from("purchase_bill_attachments")
    .select("id", { count: "exact", head: true })
    .eq("purchase_bill_id", billId);
  const existing = count ?? 0;
  if (existing + picked.length > MAX_ATTACHMENTS) {
    throw new Error(`แนบรูปได้ไม่เกิน ${MAX_ATTACHMENTS} รูปต่อรายการ (มีอยู่แล้ว ${existing} รูป)`);
  }
  for (const { file, thumb, name } of picked) {
    if (file.type === PDF_TYPE) {
      if (file.size > MAX_PDF_BYTES) throw new Error(`PDF "${name}" ใหญ่เกิน ${MAX_PDF_BYTES / 1024 / 1024} MB`);
      if (!(await isRealPdf(file))) throw new Error(`"${name}" ไม่ใช่ไฟล์ PDF ที่ถูกต้อง`);
    } else {
      if (!IMAGE_TYPES.includes(file.type)) throw new Error("แนบได้เฉพาะรูปภาพ (JPG, PNG, WebP) หรือ PDF");
      if (file.size > MAX_STORED_BYTES) throw new Error("รูปมีขนาดใหญ่เกินไป กรุณาลองเลือกรูปใหม่");
    }
    // photos and PDFs may both carry a preview picture (page 1 for PDFs)
    if (thumb && (!IMAGE_TYPES.includes(thumb.type) || thumb.size > MAX_THUMB_BYTES)) {
      throw new Error("รูปตัวอย่างไม่ถูกต้อง กรุณาลองเลือกรูปใหม่");
    }
  }

  const storage = createAdminClient().storage.from(ATTACHMENT_BUCKET);
  const uploaded: string[] = [];
  try {
    const rows = [];
    for (const [i, { file, thumb, name }] of picked.entries()) {
      const key = `${billId}/${crypto.randomUUID()}`;
      const ext = { "image/png": "png", "image/webp": "webp", [PDF_TYPE]: "pdf" }[file.type] ?? "jpg";
      const storage_path = `${key}.${ext}`;
      const { error } = await storage.upload(storage_path, file, { contentType: file.type });
      if (error) throw error;
      uploaded.push(storage_path);

      let thumb_path: string | null = null;
      if (thumb) {
        thumb_path = `${key}_thumb.jpg`;
        const { error: thumbError } = await storage.upload(thumb_path, thumb, { contentType: thumb.type });
        if (thumbError) throw thumbError;
        uploaded.push(thumb_path);
      }

      rows.push({
        purchase_bill_id: billId,
        storage_path,
        thumb_path,
        file_name: name,
        mime_type: file.type,
        size_bytes: file.size,
        sort_order: existing + i,
        created_by: createdBy,
      });
    }

    const { error } = await supabase.from("purchase_bill_attachments").insert(rows);
    if (error) throw error;
  } catch (err) {
    if (uploaded.length) await storage.remove(uploaded);
    throw err;
  }
}

/** Storage paths (full + preview) of every photo on these purchases. Read with
 * the user's client, so it must run before the purchases are deleted. */
export async function attachmentPathsForBills(supabase: SupabaseClient, billIds: string[]) {
  if (billIds.length === 0) return [];
  const { data } = await supabase
    .from("purchase_bill_attachments")
    .select("storage_path, thumb_path")
    .in("purchase_bill_id", billIds);
  return (data ?? []).flatMap((a) => [a.storage_path, a.thumb_path].filter((p): p is string => !!p));
}

/** Deletes files from the bucket. A failure only leaves unused files behind,
 * so it is logged rather than shown to the user. */
export async function removeAttachmentFiles(paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await createAdminClient().storage.from(ATTACHMENT_BUCKET).remove(paths);
  if (error) console.warn(`[attachments] could not remove ${paths.length} file(s): ${error.message}`);
}

/** Photos of each purchase with short-lived (1 hour) links for display,
 * grouped by purchase id. */
export async function attachmentViewsByBill(
  supabase: SupabaseClient,
  billIds: string[]
): Promise<Map<string, AttachmentView[]>> {
  const result = new Map<string, AttachmentView[]>();
  if (billIds.length === 0) return result;

  const { data: rows } = await supabase
    .from("purchase_bill_attachments")
    .select("id, purchase_bill_id, storage_path, thumb_path, file_name, mime_type")
    .in("purchase_bill_id", billIds)
    .order("sort_order")
    .order("created_at");
  if (!rows || rows.length === 0) return result;

  const paths = rows.flatMap((r) => [r.storage_path, r.thumb_path].filter((p): p is string => !!p));
  const { data: signed } = await createAdminClient().storage.from(ATTACHMENT_BUCKET).createSignedUrls(paths, 60 * 60);
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  for (const r of rows) {
    const fullUrl = urlByPath.get(r.storage_path) ?? null;
    const list = result.get(r.purchase_bill_id) ?? [];
    list.push({
      id: r.id,
      fileName: r.file_name,
      mimeType: r.mime_type,
      fullUrl,
      // a PDF without a page-1 preview gets a PDF tile in the gallery instead
      thumbUrl: (r.thumb_path && urlByPath.get(r.thumb_path)) || (r.mime_type === PDF_TYPE ? null : fullUrl),
    });
    result.set(r.purchase_bill_id, list);
  }
  return result;
}
