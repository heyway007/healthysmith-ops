"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

/**
 * A number field for sensitive amounts (salary): shown as dots until the eye
 * is clicked, and hidden again on every page load. It is still a normal input,
 * so the value is submitted with the form whether or not it is revealed.
 */
export function MaskedField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: number | string | null;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-teal-800" htmlFor={name}>
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={name}
          name={name}
          // "password" only to draw dots; the pattern keeps typed values numeric
          // (a text input would otherwise let junk through to the server).
          type={visible ? "text" : "password"}
          inputMode="decimal"
          pattern="[0-9]*\.?[0-9]*"
          title="กรอกเป็นตัวเลข"
          autoComplete="off"
          defaultValue={defaultValue == null ? undefined : String(defaultValue)}
          className="w-full rounded-lg border border-teal-300 py-2 pl-3 pr-10 text-sm transition-shadow focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-teal-400 transition-colors hover:text-orange-600"
          title={visible ? "ซ่อน" : "แสดง"}
          aria-label={visible ? "ซ่อน" : "แสดง"}
        >
          <FontAwesomeIcon icon={visible ? faEyeSlash : faEye} />
        </button>
      </div>
    </div>
  );
}
