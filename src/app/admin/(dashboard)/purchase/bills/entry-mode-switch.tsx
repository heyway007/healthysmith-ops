"use client";

import { useState } from "react";
import { AttachmentRequiredContext } from "@/components/ui/image-attach-input";

export type EntryMode = "attachment" | "items";

/**
 * How a purchase is recorded:
 *  - "attachment": just the amount (+ VAT) with a photo/PDF of the receipt --
 *    no line items; at least one file is required.
 *  - "items": the line-item table (รายการ / จำนวน / ราคา); files optional.
 *
 * The section not in use is a disabled <fieldset>, so its fields are neither
 * validated nor submitted. The server reads the choice from `entry_mode`.
 *
 * `vat` is one field shared by both modes: next to the amount in "แนบรูป",
 * at the right under the table in "กรอกรายละเอียด".
 */
export function EntryModeSwitch({
  defaultMode,
  items,
  amount,
  vat,
  attachments,
}: {
  defaultMode: EntryMode;
  items: React.ReactNode;
  amount: React.ReactNode;
  vat: React.ReactNode;
  attachments: React.ReactNode;
}) {
  const [mode, setMode] = useState<EntryMode>(defaultMode);

  return (
    // CSS `order` (not JSX order) puts the files above the amount in "แนบรูป"
    // mode and below the table in "กรอกรายละเอียด" mode, so the picker is never
    // re-mounted and keeps the files already chosen.
    <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:col-span-2 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-3">
      <fieldset className="order-0 sm:col-span-2 lg:col-span-3">
        <legend className="mb-2 text-sm font-medium text-teal-800">บันทึกแบบไหน</legend>
        <div className="flex flex-wrap gap-3">
          <ModeChoice
            value="attachment"
            label="แนบรูป"
            hint="แนบรูป / PDF ใบเสร็จ แล้วใส่แค่ยอดเงินกับ VAT"
            checked={mode === "attachment"}
            onSelect={setMode}
          />
          <ModeChoice
            value="items"
            label="กรอกรายละเอียด"
            hint="กรอกทีละรายการ จำนวน และราคา"
            checked={mode === "items"}
            onSelect={setMode}
          />
        </div>
      </fieldset>

      <fieldset disabled={mode !== "items"} hidden={mode !== "items"} className="order-1 sm:col-span-2 lg:col-span-3">
        {items}
      </fieldset>
      <fieldset disabled={mode !== "attachment"} hidden={mode !== "attachment"} className="order-2">
        {amount}
      </fieldset>
      <div className={mode === "attachment" ? "order-3" : "order-3 sm:col-start-2 lg:col-start-3"}>{vat}</div>

      <div className={`sm:col-span-2 lg:col-span-3 ${mode === "attachment" ? "order-1" : "order-2"}`}>
        <p className="mb-2 text-sm font-medium text-teal-800">
          {mode === "attachment" ? (
            <>
              รูปภาพ / PDF ใบเสร็จ <span className="text-orange-600">(ต้องแนบอย่างน้อย 1 ไฟล์)</span>
            </>
          ) : (
            "รูปภาพ / PDF (ถ้ามี)"
          )}
        </p>
        <AttachmentRequiredContext value={mode === "attachment"}>{attachments}</AttachmentRequiredContext>
      </div>
    </div>
  );
}

function ModeChoice({
  value,
  label,
  hint,
  checked,
  onSelect,
}: {
  value: EntryMode;
  label: string;
  hint: string;
  checked: boolean;
  onSelect: (mode: EntryMode) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-teal-200 bg-white px-4 py-3 has-checked:border-orange-400 has-checked:bg-orange-50">
      <input
        type="radio"
        name="entry_mode"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="accent-orange-500"
      />
      <span>
        <span className="block text-sm font-medium text-teal-900">{label}</span>
        <span className="block text-xs text-teal-600">{hint}</span>
      </span>
    </label>
  );
}
