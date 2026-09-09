import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-800"
    >
      <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
      {label}
    </Link>
  );
}
