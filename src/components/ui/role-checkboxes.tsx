import { ROLE_LABELS, type Role } from "@/lib/role";

/** A user can hold more than one role (e.g. sales + purchase), so this is a
 * checkbox group (name="roles", repeated) rather than a single <select>. */
export function RoleCheckboxes({
  defaultRoles = [],
  name = "roles",
}: {
  defaultRoles?: string[];
  name?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
        <label
          key={r}
          className="flex items-center gap-2 rounded-lg border border-teal-200 px-3 py-1.5 text-sm text-teal-700 transition-colors has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 has-[:checked]:text-teal-900"
        >
          <input
            type="checkbox"
            name={name}
            value={r}
            defaultChecked={defaultRoles.includes(r)}
            className="accent-teal-600"
          />
          {ROLE_LABELS[r]}
        </label>
      ))}
    </div>
  );
}
