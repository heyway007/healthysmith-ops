"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

export function MaskedValue({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="inline-flex items-center gap-2">
      <span className="tabular-nums">{visible ? value : "••••••"}</span>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="text-teal-400 transition-colors hover:text-orange-600"
        title={visible ? "ซ่อน" : "แสดง"}
        aria-label={visible ? "ซ่อน" : "แสดง"}
      >
        <FontAwesomeIcon icon={visible ? faEyeSlash : faEye} className="text-xs" />
      </button>
    </span>
  );
}
