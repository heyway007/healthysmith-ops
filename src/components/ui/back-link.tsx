import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

// The back button of every detail / form page: a framed button, so it reads
// as something to press rather than a stray link. `mist` is the employee
// front-office palette, `teal` the back office.
const TONES = {
  teal: "border-teal-300 text-teal-700 hover:bg-teal-50",
  mist: "border-mist-300 text-mist-700 hover:bg-mist-100",
} as const;

export function BackLink({ href, label, tone = "teal" }: { href: string; label: string; tone?: keyof typeof TONES }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium transition-colors ${TONES[tone]}`}
    >
      <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
      {label}
    </Link>
  );
}
