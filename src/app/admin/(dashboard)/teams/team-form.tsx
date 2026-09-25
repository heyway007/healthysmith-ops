import Link from "next/link";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formCardClassName, secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";

export function TeamForm({
  action,
  defaultName,
  submitLabel,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultName?: string;
  submitLabel: string;
  error?: string;
}) {
  return (
    <div className={`max-w-lg ${formCardClassName}`}>
      {error && <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>}
      <form action={action} className="space-y-4">
        <Field label="ชื่อทีม" name="name" required defaultValue={defaultName} />
        <div className="flex items-center gap-4 pt-2">
          <SubmitButton className={submitButtonClassName}>{submitLabel}</SubmitButton>
          <Link href="/admin/teams" className={secondaryButtonClassName}>
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
