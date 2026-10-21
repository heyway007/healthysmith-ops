// "v0.1.0 BETA" -- version string comes from lib/version.ts (passed in, so
// this also works inside Client Components like the sidebar).

const STAGE_LABELS: Record<string, string> = {
  alpha: "ALPHA",
  beta: "BETA",
  rc: "RC",
};

const TONES = {
  dark: "text-teal-200",
  teal: "text-teal-600",
  mist: "text-mist-500",
};

export function VersionBadge({
  version,
  tone = "mist",
  className = "",
}: {
  version: string;
  /** "dark" = on the teal sidebar, "teal" = back-office light pages, "mist" = front office. */
  tone?: keyof typeof TONES;
  className?: string;
}) {
  const [base, prerelease] = version.split("-", 2);
  const stage = prerelease?.split(".")[0].toLowerCase();
  const stageLabel = stage ? (STAGE_LABELS[stage] ?? stage.toUpperCase()) : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-normal ${TONES[tone]} ${className}`}
      title={stageLabel ? `เวอร์ชัน ${version} — อยู่ระหว่างทดสอบ อาจพบข้อผิดพลาดได้` : `เวอร์ชัน ${version}`}
    >
      <span className="tabular-nums">v{base}</span>
      {stageLabel && (
        <span className="rounded-full bg-amber-400 px-1.5 py-px text-[10px] font-semibold leading-4 tracking-wide text-amber-950">
          {stageLabel}
        </span>
      )}
    </span>
  );
}
