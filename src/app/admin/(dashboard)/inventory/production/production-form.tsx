"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { SubmitButton } from "@/components/ui/submit-button";
import { ProductLinesEditor, type PickableProduct, type ProductLine } from "@/components/inventory/product-lines-editor";
import { formCardClassName, secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import { saveProductionOrder } from "./actions";

export type ProductionDefaults = {
  order_date: string;
  due_date: string | null;
  producer_name: string | null;
  note: string | null;
};

export function ProductionForm({
  id,
  defaults,
  products,
  producers,
  initialLines,
  receivedByProduct,
  submitLabel,
}: {
  /** null = new order */
  id: string | null;
  defaults: ProductionDefaults;
  products: PickableProduct[];
  /** producer names used before, offered as suggestions */
  producers: string[];
  initialLines?: ProductLine[];
  /** product id -> quantity already received (those rows can't go lower or be removed) */
  receivedByProduct?: Record<string, number>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(saveProductionOrder.bind(null, id), null);

  return (
    <div className={formCardClassName}>
      {state?.error && <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{state.error}</p>}

      <form action={formAction} className="space-y-6">
        <FormSection title="ใบผลิตสินค้า">
          <Field label="วันที่สั่งผลิต" name="order_date" type="date" required defaultValue={defaults.order_date} />
          <Field label="ต้องการรับภายใน (ถ้ามี)" name="due_date" type="date" defaultValue={defaults.due_date} />
          <Field
            label="ผู้ผลิต / โรงงาน"
            name="producer_name"
            defaultValue={defaults.producer_name}
            list="producer-options"
            listOptions={producers}
          />
          <Field label="หมายเหตุ" name="note" rows={3} defaultValue={defaults.note} className="sm:col-span-2 lg:col-span-3" />
        </FormSection>

        <FormSection title="สินค้าที่จะผลิต">
          <div className="sm:col-span-2 lg:col-span-3">
            <ProductLinesEditor products={products} initialLines={initialLines} minQuantity={receivedByProduct} />
            <p className="mt-2 text-xs text-teal-600">
              รับสินค้าเข้าคลังได้หลายครั้งจากหน้ารายละเอียดใบผลิต — ใส่จำนวนรวมที่สั่งผลิตทั้งหมดที่นี่
            </p>
          </div>
        </FormSection>

        <div className="flex items-center gap-4 border-t border-teal-100 pt-5">
          <SubmitButton className={submitButtonClassName}>{submitLabel}</SubmitButton>
          <Link
            href={id ? `/admin/inventory/production/${id}` : "/admin/inventory/production"}
            className={secondaryButtonClassName}
          >
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
