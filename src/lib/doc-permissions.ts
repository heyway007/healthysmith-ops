// Per-user permissions on tax documents (ใบกำกับภาษี / หนังสือรับรองหัก ณ ที่จ่าย).
// Mirrors user_roles.doc_permissions and current_doc_permissions() in
// 0018_document_controls.sql -- the database enforces them; this only decides
// what the UI shows. Client-safe.

export const DOC_PERMISSIONS = [
  { key: "view", label: "ดู / พิมพ์", hint: "เปิดดู ค้นหา พิมพ์ และส่งออกเอกสาร" },
  { key: "create", label: "เพิ่ม (ออกเอกสาร)", hint: "ออกเอกสารใหม่" },
  { key: "edit", label: "แก้ไข", hint: "ออกฉบับแก้ไขแทนฉบับเดิม — ฉบับเดิมถูกยกเลิกและเก็บไว้" },
  { key: "cancel", label: "ยกเลิก", hint: "ขอยกเลิกเอกสาร (รอผู้อนุมัติ)" },
  { key: "approve", label: "อนุมัติ", hint: "อนุมัติ/ไม่อนุมัติคำขอยกเลิก และยกเลิกได้ทันที" },
] as const;

export type DocPermission = (typeof DOC_PERMISSIONS)[number]["key"];

export const DOC_PERMISSION_LABELS = Object.fromEntries(DOC_PERMISSIONS.map((p) => [p.key, p.label])) as Record<
  DocPermission,
  string
>;

/** Any document permission implies viewing (same rule as has_doc_permission('view')). */
export function canDoc(perms: readonly string[], p: DocPermission) {
  return p === "view" ? perms.length > 0 : perms.includes(p);
}

export function docPermissionsFromForm(formData: FormData): DocPermission[] {
  const known = DOC_PERMISSIONS.map((p) => p.key) as string[];
  return formData.getAll("doc_permissions").map(String).filter((p): p is DocPermission => known.includes(p));
}
