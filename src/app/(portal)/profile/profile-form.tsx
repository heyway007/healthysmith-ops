"use client";

import { useActionState } from "react";
import { PREFIX_NAMES } from "@/lib/prefix-names";
import { inputClassName, primaryButtonClassName } from "../ui";
import { updateProfile } from "./actions";
import type { ProfileField, ProfileFormState, ProfileValues } from "./schema";

const errorInputClassName = "border-rose-400 focus:border-rose-500 focus:ring-rose-100";

export function ProfileForm({
  initialValues,
  children,
}: {
  initialValues: ProfileValues;
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(updateProfile, {
    status: "idle",
  });

  // After a submit, show what the user typed (or the normalised saved values)
  // rather than resetting to what was loaded with the page.
  const values = state.values ?? initialValues;
  const errors = state.fieldErrors ?? {};

  const field = (name: ProfileField) => ({
    name,
    defaultValue: values[name],
    error: errors[name],
  });

  return (
    // Remount on every result so defaultValue picks up `values`.
    <form key={JSON.stringify(state)} action={formAction} noValidate className="space-y-8">
      {state.status === "success" && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {state.message}
        </p>
      )}

      <section>
        <h2 className="text-sm font-semibold text-indigo-900">ข้อมูลส่วนตัว</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-indigo-800" htmlFor="prefix_name">
              คำนำหน้า
            </label>
            <select
              id="prefix_name"
              name="prefix_name"
              defaultValue={values.prefix_name}
              className={`${inputClassName} ${errors.prefix_name ? errorInputClassName : ""}`}
            >
              <option value="">- เลือกคำนำหน้า -</option>
              {PREFIX_NAMES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <FieldError message={errors.prefix_name} />
          </div>
          <LabeledInput label="ชื่อจริง" required {...field("first_name")} />
          <LabeledInput label="นามสกุล" required {...field("last_name")} />
          <LabeledInput label="ชื่อเล่น" {...field("nickname")} />
          <LabeledInput
            label="เลขบัตรประชาชน"
            inputMode="numeric"
            placeholder="13 หลัก"
            {...field("id_card_number")}
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-indigo-900">ช่องทางติดต่อ</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <LabeledInput label="เบอร์โทร" type="tel" placeholder="0812345678" {...field("phone")} />
          <LabeledInput label="อีเมล" type="email" placeholder="name@example.com" {...field("email")} />
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <label className="block text-sm font-medium text-indigo-800" htmlFor="address">
              ที่อยู่
            </label>
            <textarea
              id="address"
              name="address"
              defaultValue={values.address}
              rows={2}
              aria-invalid={!!errors.address}
              className={`${inputClassName} ${errors.address ? errorInputClassName : ""}`}
            />
            <FieldError message={errors.address} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-indigo-900">ข้อมูลธนาคาร</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <LabeledInput label="ธนาคาร" placeholder="เช่น กสิกรไทย" {...field("bank_name")} />
          <LabeledInput
            label="เลขบัญชี"
            inputMode="numeric"
            placeholder="10–15 หลัก"
            {...field("bank_account_number")}
          />
          <LabeledInput label="ชื่อบัญชี" {...field("bank_account_name")} />
        </div>
      </section>

      {children}

      <button type="submit" disabled={pending} className={`${primaryButtonClassName} disabled:opacity-60`}>
        {pending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
      </button>
    </form>
  );
}

function LabeledInput({
  label,
  name,
  defaultValue,
  error,
  type = "text",
  required = false,
  inputMode,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
  type?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-indigo-800" htmlFor={name}>
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`${inputClassName} ${error ? errorInputClassName : ""}`}
      />
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-rose-600">
      {message}
    </p>
  );
}
