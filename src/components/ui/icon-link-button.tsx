import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/**
 * Round icon-only link for table row actions (view / edit), sized like
 * <DeleteButton> beside it. `label` is the tooltip and the accessible name.
 */
export function IconLinkButton({ href, icon, label }: { href: string; icon: IconDefinition; label: string }) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-teal-200 text-teal-600 transition-colors hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800"
    >
      <FontAwesomeIcon icon={icon} />
    </Link>
  );
}
