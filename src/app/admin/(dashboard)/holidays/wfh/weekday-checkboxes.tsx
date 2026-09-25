export const WORKDAYS = [
  { value: 1, label: "จันทร์" },
  { value: 2, label: "อังคาร" },
  { value: 3, label: "พุธ" },
  { value: 4, label: "พฤหัสบดี" },
  { value: 5, label: "ศุกร์" },
];

/** Mon–Fri checkboxes, submitted as repeated name="weekdays". */
export function WeekdayCheckboxes({ label, tone = "sky" }: { label: string; tone?: "sky" | "orange" }) {
  const border =
    tone === "orange" ? "border-orange-200 has-[:checked]:border-orange-500" : "border-teal-200 has-[:checked]:border-sky-500";
  const accent = tone === "orange" ? "accent-orange-600" : "accent-sky-600";

  return (
    <div>
      <span className="block text-sm font-medium text-teal-800">{label}</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {WORKDAYS.map((d) => (
          <label
            key={d.value}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-teal-700 transition-colors has-[:checked]:bg-sky-50 has-[:checked]:text-sky-800 ${border}`}
          >
            <input type="checkbox" name="weekdays" value={d.value} className={accent} />
            {d.label}
          </label>
        ))}
      </div>
    </div>
  );
}
