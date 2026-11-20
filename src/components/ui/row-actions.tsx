import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/**
 * The "จัดการ" cell of a list row. Every list uses the same slots, in this
 * order, so the buttons line up from page to page:
 *   ดู (faEye) · แก้ไข (faPenToSquare) · ยกเลิก (faBan, with a reason) or ลบ (faTrash)
 * A slot that can't be used on this row stays in place but greyed out
 * (<DisabledIconButton>, the reason is its tooltip) instead of disappearing.
 */
export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-2">{children}</div>;
}

export function DisabledIconButton({ icon, label }: { icon: IconDefinition; label: string }) {
  return (
    <button
      type="button"
      disabled
      title={label}
      aria-label={label}
      className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-full border border-gray-200 text-gray-300"
    >
      <FontAwesomeIcon icon={icon} />
    </button>
  );
}
