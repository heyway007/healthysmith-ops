"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDice, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

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

  const mismatch = (password.length > 0 || confirmation.length > 0) && password !== confirmation;

  function handleGenerate() {
    const generated = generatePassword();
    setPassword(generated);
    setConfirmation(generated);
    setVisible(true);
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
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            required={required}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-teal-300 px-3 py-2 pr-11 text-sm transition-shadow focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
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
        <p className="mt-1 text-xs text-teal-500">
          {helperText ?? (required ? "อย่างน้อย 8 ตัวอักษร" : "เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน")}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-800" htmlFor="password_confirmation">
          ยืนยันรหัสผ่าน
        </label>
        <input
          id="password_confirmation"
          name="password_confirmation"
          type={visible ? "text" : "password"}
          required={required}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm transition-shadow focus:outline-none focus:ring-2 ${
            mismatch
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
              : "border-teal-300 focus:border-teal-600 focus:ring-teal-100"
          }`}
        />
        {mismatch && <p className="mt-1 text-xs text-rose-600">รหัสผ่านไม่ตรงกัน</p>}
      </div>
    </>
  );
}
