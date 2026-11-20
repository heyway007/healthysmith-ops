"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRoles } from "@/lib/current-role";
import { emptyToNull } from "@/lib/forms";
import { LOGO_BUCKET, LOGO_MAX_BYTES, LOGO_TYPES } from "@/lib/company-logo-rules";

const LOGO_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Path inside the logo bucket if this URL is one of ours, else null. */
function ownLogoPath(url: string | null) {
  const marker = `/object/public/${LOGO_BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  return url && i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

/** Uploads the picked logo and returns its permanent public URL. Throws a Thai message on a bad file. */
async function uploadLogo(file: File) {
  if (!LOGO_TYPES.includes(file.type)) throw new Error("โลโก้ใช้ได้เฉพาะไฟล์ JPG, PNG หรือ WebP");
  if (file.size > LOGO_MAX_BYTES) throw new Error(`ไฟล์โลโก้ต้องไม่เกิน ${LOGO_MAX_BYTES / 1024 / 1024} MB`);

  const storage = createAdminClient().storage;
  const path = `logo/${crypto.randomUUID()}.${LOGO_EXT[file.type]}`;
  const put = () => storage.from(LOGO_BUCKET).upload(path, file, { contentType: file.type });
  let { error } = await put();
  if (error && /bucket not found/i.test(error.message)) {
    // migration 0025 not applied yet -- create the bucket on the fly
    await storage.createBucket(LOGO_BUCKET, {
      public: true,
      fileSizeLimit: LOGO_MAX_BYTES,
      allowedMimeTypes: LOGO_TYPES,
    });
    ({ error } = await put());
  }
  if (error) throw new Error(`อัพโหลดโลโก้ไม่สำเร็จ: ${error.message}`);
  return storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Our company details printed on every tax invoice and 50 ทวิ certificate (single row). */
export async function saveCompany(formData: FormData) {
  const supabase = await createClient();
  const taxId = emptyToNull(formData.get("tax_id"))?.replace(/[\s-]/g, "") ?? null;
  const branch = String(formData.get("branch_code") ?? "").replace(/\D/g, "").padStart(5, "0").slice(-5);
  const fields = {
    name: String(formData.get("name") ?? "").trim(),
    tax_id: taxId,
    branch_code: branch,
    address: emptyToNull(formData.get("address")),
    phone: emptyToNull(formData.get("phone")),
    email: emptyToNull(formData.get("email")),
  };

  let message: string | null = null;
  if (!fields.name) message = "กรุณากรอกชื่อบริษัท";
  else if (taxId && !/^\d{13}$/.test(taxId)) message = "เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก";
  else {
    const id = emptyToNull(formData.get("id"));
    const picked = formData.get("logo_file");
    const newLogo = picked instanceof File && picked.size > 0 ? picked : null;
    const removeLogo = formData.get("remove_logo") === "1";

    let oldLogoUrl: string | null = null;
    let uploadedUrl: string | null = null;
    try {
      if (newLogo || removeLogo) {
        // the upload uses the service-role key, so check the role first
        if (!(await getCurrentRoles()).includes("admin")) throw new Error("เฉพาะผู้ดูแลระบบ (admin) เท่านั้นที่เปลี่ยนโลโก้ได้");
        if (id) {
          const { data } = await supabase.from("companies").select("logo_url").eq("id", id).maybeSingle();
          oldLogoUrl = data?.logo_url ?? null;
        }
        if (newLogo) uploadedUrl = await uploadLogo(newLogo);
      }
    } catch (err) {
      message = err instanceof Error ? err.message : "อัพโหลดโลโก้ไม่สำเร็จ";
    }

    if (!message) {
      // logo_url is only touched when a logo was uploaded or removed
      const row = newLogo ? { ...fields, logo_url: uploadedUrl } : removeLogo ? { ...fields, logo_url: null } : fields;
      const { error } = id
        ? await supabase.from("companies").update(row).eq("id", id)
        : await supabase.from("companies").insert(row);
      if (error) {
        message = error.message;
        const orphan = ownLogoPath(uploadedUrl);
        if (orphan) await createAdminClient().storage.from(LOGO_BUCKET).remove([orphan]);
      } else {
        const old = ownLogoPath(oldLogoUrl);
        if (old) await createAdminClient().storage.from(LOGO_BUCKET).remove([old]);
      }
    }
  }

  if (message) redirect(`/admin/tax-documents/company?error=${encodeURIComponent(message)}`);
  revalidatePath("/admin/tax-documents", "layout");
  revalidatePath("/admin/print", "layout");
  redirect("/admin/tax-documents/company?saved=1");
}
