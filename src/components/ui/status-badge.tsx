export type StatusConfig = Record<string, { label: string; className: string }>;

export function StatusBadge({ status, config }: { status: string; config: StatusConfig }) {
  const c = config[status] ?? { label: status, className: "bg-teal-100 text-teal-700" };
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${c.className}`}
    >
      {c.label}
    </span>
  );
}
