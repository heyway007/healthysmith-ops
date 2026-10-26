"use client";

/** Header checkbox that ticks/unticks every `name` checkbox in its form. */
export function SelectAllCheckbox({ name }: { name: string }) {
  return (
    <input
      type="checkbox"
      aria-label="เลือกทั้งหมด"
      className="size-4 accent-teal-600"
      onChange={(e) => {
        e.currentTarget.form
          ?.querySelectorAll<HTMLInputElement>(`input[type=checkbox][name="${name}"]`)
          .forEach((box) => {
            box.checked = e.currentTarget.checked;
          });
      }}
    />
  );
}
