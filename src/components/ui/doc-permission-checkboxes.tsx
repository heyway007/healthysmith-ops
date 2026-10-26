import { DOC_PERMISSIONS } from "@/lib/doc-permissions";

/** Tax-document permissions for a user (name="doc_permissions", repeated). */
export function DocPermissionCheckboxes({ defaultPermissions = [] }: { defaultPermissions?: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {DOC_PERMISSIONS.map((p) => (
        <label
          key={p.key}
          className="flex cursor-pointer items-start gap-2 rounded-lg border border-teal-200 px-3 py-2 text-sm text-teal-700 transition-colors has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 has-[:checked]:text-teal-900"
        >
          <input
            type="checkbox"
            name="doc_permissions"
            value={p.key}
            defaultChecked={defaultPermissions.includes(p.key)}
            className="mt-0.5 accent-teal-600"
          />
          <span>
            <span className="font-medium">{p.label}</span>
            <span className="block text-xs text-teal-500">{p.hint}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
