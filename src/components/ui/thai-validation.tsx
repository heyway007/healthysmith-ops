"use client";

import { useEffect } from "react";

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** The field's name as the user sees it: its <label> text without "(ถ้ามี)" / "*". */
function fieldLabel(el: Field): string {
  const text =
    el.labels?.[0]?.textContent ??
    el.getAttribute("aria-label") ??
    ("placeholder" in el ? el.placeholder : "") ??
    "";
  const clean = text
    .replace(/,\s*(ถ้ามี|ไม่บังคับ)\s*\)/g, ")") // "VAT (บาท, ถ้ามี)" -> "VAT (บาท)"
    .replace(/\(\s*(ถ้ามี|ไม่บังคับ)\s*\)/g, "") // "เลขที่ใบเสร็จ (ถ้ามี)" -> "เลขที่ใบเสร็จ"
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return clean || "ช่องนี้";
}

/** "กรุณากรอก" + "ร้าน" -> "กรุณากรอกร้าน", but "กรุณากรอก" + "VAT" -> "กรุณากรอก VAT". */
function ask(prefix: string, label: string) {
  return /^[฀-๿]/.test(label) ? `${prefix}${label}` : `${prefix} ${label}`;
}

/** A Thai message naming the field, for the browser's own "Please fill out this field." etc. */
function messageFor(el: Field): string {
  const v = el.validity;
  const label = fieldLabel(el);
  const type = el instanceof HTMLInputElement ? el.type : el instanceof HTMLSelectElement ? "select" : "textarea";

  if (v.valueMissing) {
    if (type === "select" || type === "radio" || type === "checkbox") return ask("กรุณาเลือก", label);
    if (type === "file") return ask("กรุณาแนบ", label);
    return ask("กรุณากรอก", label);
  }
  if (v.badInput) return type === "number" ? `${label} ต้องเป็นตัวเลข` : `${label} ไม่ถูกต้อง`;
  if (v.typeMismatch) {
    if (type === "email") return "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com";
    if (type === "url") return "กรุณากรอกลิงก์ให้ถูกต้อง เช่น https://example.com";
    return `${label} รูปแบบไม่ถูกต้อง`;
  }
  if (el instanceof HTMLInputElement) {
    if (v.rangeUnderflow) return `${label} ต้องไม่น้อยกว่า ${el.min}`;
    if (v.rangeOverflow) return `${label} ต้องไม่เกิน ${el.max}`;
    if (v.stepMismatch) return `${label} ไม่ถูกต้อง (ทศนิยมเกินที่กำหนด)`;
  }
  if (v.tooShort && "minLength" in el) return `${label} ต้องมีอย่างน้อย ${el.minLength} ตัวอักษร`;
  if (v.tooLong && "maxLength" in el) return `${label} ต้องไม่เกิน ${el.maxLength} ตัวอักษร`;
  if (v.patternMismatch) return el.title || `${label} รูปแบบไม่ถูกต้อง`;
  return `${label} ไม่ถูกต้อง`;
}

/**
 * Replaces the browser's built-in form messages ("Please fill out this field.")
 * with Thai ones that name the field, e.g. "กรุณากรอกร้าน / ผู้ขาย", on every
 * form in the app. Mounted once in the root layout; renders nothing.
 *
 * Messages a component sets itself with setCustomValidity (the date input,
 * the file picker) are left alone -- only messages set here are replaced, and
 * they are cleared as soon as the user edits the field.
 */
export function ThaiValidation() {
  useEffect(() => {
    const ours = new WeakSet<Field>();
    const isField = (t: EventTarget | null): t is Field =>
      t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement;

    // "invalid" doesn't bubble, so listen in the capture phase.
    const onInvalid = (e: Event) => {
      const el = e.target;
      if (!isField(el)) return;
      if (el.validity.customError) {
        if (!ours.has(el)) return; // a component's own message
        el.setCustomValidity(""); // re-check what is actually wrong now
        if (el.validity.valid) return;
      }
      el.setCustomValidity(messageFor(el));
      ours.add(el);
    };
    const onEdit = (e: Event) => {
      const el = e.target;
      if (!isField(el) || !ours.has(el)) return;
      el.setCustomValidity("");
      ours.delete(el);
      // a radio group shares one message -- clear it on the whole group
      if (el instanceof HTMLInputElement && el.type === "radio" && el.form && el.name) {
        el.form.querySelectorAll<HTMLInputElement>(`input[type=radio][name="${CSS.escape(el.name)}"]`).forEach((r) => {
          if (ours.has(r)) {
            r.setCustomValidity("");
            ours.delete(r);
          }
        });
      }
    };

    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", onEdit, true);
    document.addEventListener("change", onEdit, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", onEdit, true);
      document.removeEventListener("change", onEdit, true);
    };
  }, []);

  return null;
}
