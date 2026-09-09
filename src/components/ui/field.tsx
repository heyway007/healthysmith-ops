export function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  className = "",
  list,
  listOptions,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number | null;
  className?: string;
  /** id of a <datalist> to attach for free-text autocomplete */
  list?: string;
  /** when set (together with `list`), renders the <datalist> options too */
  listOptions?: string[];
  /** defaults to "any" for type="number" so decimal amounts/quantities are always valid */
  step?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-teal-800" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? undefined}
        list={list}
        step={type === "number" ? (step ?? "any") : undefined}
        autoComplete="off"
        className="mt-1 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm transition-shadow focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
      />
      {list && listOptions && (
        <datalist id={list}>
          {listOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </div>
  );
}
