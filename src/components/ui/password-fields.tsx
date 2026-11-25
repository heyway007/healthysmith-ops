"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle, faCircleCheck, faDice, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

const rules = [
  { label: "ความยาวอย่างน้อย 8 ตัวอักษร", test: (p: string) => p.length >= 8 },
  { label: "มีตัวอักษรภาษาอังกฤษอย่างน้อย 1 ตัว (A-Z, a-z)", test: (p: string) => /[A-Za-z]/.test(p) },
  { label: "มีตัวเลขอย่างน้อย 1 ตัว (0-9)", test: (p: string) => /\d/.test(p) },
];

function generatePassword(length = 14): string {
  const lower = "abcdefghijkmnpqrstuvwxyz"; // l/o dropped -- easy to misread
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_=+";
  const all = lower + upper + digits + symbols;
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

  const chars = [pick(lower), pick(upper), pick(digits), pick(symbols)];
  for (let i = chars.length; i < length; i++) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function PasswordFields({
  required = true,
  label = "รหัสผ่าน",
  helperText,
}: {
  /** false for an edit form where blank means "keep the current password" */
  required?: boolean;
  label?: string;
  helperText?: string;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const mismatch = (password.length > 0 || confirmation.length > 0) && password !== confirmation;
  const weak = password.length > 0 && !rules.every((r) => r.test(password));

  // Block form submit natively (and focus this field) while the password is weak.
  useEffect(() => {
    inputRef.current?.setCustomValidity(weak ? "รหัสผ่านยังไม่ตรงตามเงื่อนไข" : "");
  }, [weak]);

  function handleGenerate() {
    const generated = generatePassword();
    setPassword(generated);
    setConfirmation(generated);
    setVisible(true);
    setConfirmVisible(true);
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-teal-800" htmlFor="password">
            {label}
          </label>
          <button
            type="button"
            onClick={handleGenerate}
            className="flex items-center gap-1 rounded-md border border-teal-200 px-2 py-1 text-xs font-medium text-teal-600 hover:border-orange-300 hover:text-orange-600"
          >
            <FontAwesomeIcon icon={faDice} />
            สุ่มรหัสผ่านอัตโนมัติ
          </button>
        </div>
        <div className="relative mt-1">
          <input
            ref={inputRef}
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            required={required}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={weak}
            className={`w-full rounded-lg border px-3 py-2 pr-11 text-sm transition-shadow focus:outline-none focus:ring-2 ${
              weak
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                : "border-teal-300 focus:border-teal-600 focus:ring-teal-100"
            }`}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-teal-400 hover:text-teal-700"
            title={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          >
            <FontAwesomeIcon icon={visible ? faEyeSlash : faEye} />
          </button>
        </div>
        {!required && password.length === 0 ? (
          <p className="mt-1 text-xs text-teal-500">{helperText ?? "เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน"}</p>
        ) : (
          <ul className="mt-1.5 space-y-0.5 text-xs">
            {rules.map((rule) => {
              const ok = rule.test(password);
              const touched = password.length > 0;
              return (
                <li
                  key={rule.label}
                  className={`flex items-center gap-1.5 ${
                    ok ? "text-emerald-600" : touched ? "text-rose-600" : "text-teal-500"
                  }`}
                >
                  <FontAwesomeIcon icon={ok ? faCircleCheck : faCircle} className={ok ? "" : "text-[6px]"} fixedWidth />
                  {rule.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-800" htmlFor="password_confirmation">
          ยืนยันรหัสผ่าน
        </label>
        <div className="relative mt-1">
          <input
            id="password_confirmation"
            name="password_confirmation"
            type={confirmVisible ? "text" : "password"}
            required={required}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 pr-11 text-sm transition-shadow focus:outline-none focus:ring-2 ${
              mismatch
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                : "border-teal-300 focus:border-teal-600 focus:ring-teal-100"
            }`}
          />
          <button
            type="button"
            onClick={() => setConfirmVisible((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-teal-400 hover:text-teal-700"
            title={confirmVisible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          >
            <FontAwesomeIcon icon={confirmVisible ? faEyeSlash : faEye} />
          </button>
        </div>
        {mismatch && <p className="mt-1 text-xs text-rose-600">รหัสผ่านไม่ตรงกัน</p>}
      </div>
    </>
  );
}
