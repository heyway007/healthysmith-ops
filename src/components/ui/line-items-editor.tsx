"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";

export type LineItemColumn = {
  /** form field becomes `item_<key>`, one input per row, in row order */
  key: string;
  label: string;
  type?: "text" | "number";
  step?: string;
  className?: string;
};

function emptyRow(columns: LineItemColumn[]): Record<string, string> {
  return Object.fromEntries(columns.map((c) => [c.key, ""]));
}

export function LineItemsEditor({
  columns,
  initialRows,
}: {
  columns: LineItemColumn[];
  initialRows?: Record<string, string>[];
}) {
  const [rows, setRows] = useState<Record<string, string>[]>(
    initialRows && initialRows.length > 0 ? initialRows : [emptyRow(columns)]
  );

  function addRow() {
    setRows((r) => [...r, emptyRow(columns)]);
  }

  function removeRow(index: number) {
    setRows((r) => (r.length > 1 ? r.filter((_, i) => i !== index) : [emptyRow(columns)]));
  }

  function updateCell(index: number, key: string, value: string) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-teal-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
              {columns.map((c) => (
                <th key={c.key} className={`px-3 py-2 ${c.className ?? ""}`}>
                  {c.label}
                </th>
              ))}
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-teal-100">
                {columns.map((c) => (
                  <td key={c.key} className="px-2 py-1.5">
                    <input
                      name={`item_${c.key}`}
                      type={c.type ?? "text"}
                      step={c.step}
                      value={row[c.key]}
                      onChange={(e) => updateCell(i, c.key, e.target.value)}
                      className="w-full rounded-md border border-teal-200 px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="rounded p-1.5 text-orange-500 hover:bg-orange-50"
                    title="ลบรายการ"
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-xs" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="mt-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
      >
        <FontAwesomeIcon icon={faPlus} className="text-xs" />
        เพิ่มรายการ
      </button>
    </div>
  );
}
