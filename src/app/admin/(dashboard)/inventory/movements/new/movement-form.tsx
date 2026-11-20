"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { SubmitButton } from "@/components/ui/submit-button";
import { ProductLinesEditor, type PickableProduct, type ProductLine } from "@/components/inventory/product-lines-editor";
import type { LotOption } from "@/components/inventory/lots";
import { formCardClassName, secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import { postMovements } from "../actions";

export function MovementForm({
  type,
  products,
  lots,
  initialLines,
  today,
}: {
  type: "in" | "out";
  products: PickableProduct[];
  lots: LotOption[];
  initialLines?: ProductLine[];
  today: string;
}) {
  const [state, formAction] = useActionState(postMovements, null);

  return (
    <div className={formCardClassName}>
      {state?.error && <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{state.error}</p>}

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="type" value={type} />
        <FormSection title={type === "in" ? "รับสินค้าเข้าคลัง" : "เบิก / ตัดสินค้าออกจากคลัง"}>
          <Field label="วันที่" name="movement_date" type="date" defaultValue={today} />
          <Field
            label={type === "in" ? "เลขที่อ้างอิง (ใบส่งของ / ใบสั่งซื้อ)" : "เลขที่อ้างอิง (ออเดอร์ / ใบเบิก)"}
            name="ref_no"
          />
          <Field label="หมายเหตุ" name="note" rows={3} />
          <div className="sm:col-span-2 lg:col-span-3">
            <ProductLinesEditor
              products={products}
              initialLines={initialLines}
              withLot={type === "in"}
              pickLot={type === "out"}
              lots={lots}
              today={today}
              showOnHand
            />
            {type === "in" && (
              <p className="mt-2 text-xs text-teal-600">
                สินค้าที่ติดตามเป็นล็อต (มีเครื่องหมาย &quot;ล็อต&quot;) ต้องระบุเลข Lot · ล็อตเดียวกันมีวันหมดอายุได้วันเดียว · สินค้าเดียวกันหลายล็อตให้เพิ่มเป็นหลายบรรทัด
              </p>
            )}
            {type === "out" && (
              <p className="mt-2 text-xs text-teal-600">
                สินค้าที่ติดตามเป็นล็อตต้องเลือกล็อตที่เบิก (ระบบเลือกล็อตที่หมดอายุก่อนให้) และเบิกเกินยอดของล็อตนั้นไม่ได้ — ต้องการเบิกหลายล็อตให้เพิ่มเป็นหลายบรรทัด ·
                ถ้าของจริงไม่ตรงกับระบบ ให้ใช้ &quot;นับสต๊อก&quot; ปรับยอดก่อน
              </p>
            )}
          </div>
        </FormSection>

        <div className="flex items-center gap-4 border-t border-teal-100 pt-5">
          <SubmitButton className={submitButtonClassName}>{type === "in" ? "บันทึกรับเข้า" : "บันทึกเบิกออก"}</SubmitButton>
          <Link href="/admin/inventory/movements" className={secondaryButtonClassName}>
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
