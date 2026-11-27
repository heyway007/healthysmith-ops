"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import { DeleteButton } from "@/components/ui/delete-button";
import { filterInputClassName } from "@/components/ui/list-filter";
import { Pagination } from "@/components/ui/pagination";
import { secondaryButtonClassName, selectClassName } from "@/lib/ui-classes";
import { EMPLOYMENT_TYPES } from "./employment-types";

export type EmployeeRow = {
  id: string;
  employee_code: string;
  prefix_name: string | null;
  first_name: string;
  last_name: string;
  nickname: string | null;
  scan_code: number | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  employment_type: string;
};

const labelClassName = "block text-xs font-medium text-teal-700";
const fullName = (e: EmployeeRow) => `${e.prefix_name ?? ""}${e.first_name} ${e.last_name}`;

/**
 * Employee list with its filter bar. Filtered and paged in the browser (the
 * page hands over everyone), so typing never reloads or changes the URL; a
 * dropdown suggests matching people while typing. Salary is deliberately not
 * part of the rows.
 */
export function EmployeeList({
  employees,
  departments,
  pageSize,
  deleteEmployee,
}: {
  employees: EmployeeRow[];
  departments: string[];
  pageSize: number;
  deleteEmployee: (id: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [department, setDepartment] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  const q = text.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      employees.filter(
        (e) =>
          (!department || e.department === department) &&
          (!type || e.employment_type === type) &&
          (!q ||
            [e.employee_code, e.prefix_name, e.first_name, e.last_name, e.nickname, e.scan_code, e.phone, e.department, e.position]
              .join(" ")
              .toLowerCase()
              .includes(q)),
      ),
    [employees, q, department, type],
  );
  const suggestions = q ? filtered.slice(0, 8) : [];
  const showList = open && suggestions.length > 0;

  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * size, current * size);
  const active = !!(q || department || type);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pick = (e: EmployeeRow) => {
    setText(e.employee_code);
    setPage(1);
    setOpen(false);
    setHighlight(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && showList) {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && showList) {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showList && highlight >= 0) pick(suggestions[highlight]);
      else setOpen(false);
    }
  };

  return (
    <>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
        <div ref={box} className="relative sm:w-72">
          <label className={labelClassName} htmlFor="q">
            ค้นหา
          </label>
          <input
            id="q"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPage(1);
              setOpen(true);
              setHighlight(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="รหัส / ชื่อ / ชื่อเล่น / รหัสสแกน"
            autoComplete="off"
            role="combobox"
            aria-expanded={showList}
            aria-controls="employee-suggestions"
            aria-autocomplete="list"
            className={`${filterInputClassName} w-full`}
          />
          {showList && (
            <ul
              id="employee-suggestions"
              role="listbox"
              className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-teal-200 bg-white py-1 shadow-lg"
            >
              {suggestions.map((s, i) => (
                <li key={s.id} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    // mousedown (not click) so it fires before the input loses focus
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(s);
                    }}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm ${i === highlight ? "bg-teal-50" : ""}`}
                  >
                    <span className="font-medium text-teal-900">
                      {s.employee_code}
                      {s.nickname && <span className="ml-2 font-normal text-teal-600">({s.nickname})</span>}
                    </span>
                    <span className="text-teal-700">{fullName(s)}</span>
                    {s.scan_code != null && <span className="text-xs text-teal-500">รหัสสแกน {s.scan_code}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sm:w-44">
          <label className={labelClassName} htmlFor="department">
            แผนก
          </label>
          <select
            id="department"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            className={selectClassName}
          >
            <option value="">ทุกแผนก</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-44">
          <label className={labelClassName} htmlFor="type">
            ประเภทการจ้าง
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className={selectClassName}
          >
            <option value="">ทุกประเภท</option>
            {Object.entries(EMPLOYMENT_TYPES).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {active && (
          <button
            type="button"
            onClick={() => {
              setText("");
              setDepartment("");
              setType("");
              setPage(1);
            }}
            className={`${secondaryButtonClassName} self-start sm:self-auto`}
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="stack-table w-full text-sm md:min-w-[720px]">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">รหัส</th>
              <th className="px-4 py-3">ชื่อ-นามสกุล</th>
              <th className="px-4 py-3">ชื่อเล่น</th>
              <th className="px-4 py-3">รหัสสแกน</th>
              <th className="px-4 py-3">แผนก / ตำแหน่ง</th>
              <th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-t border-teal-100 hover:bg-teal-50">
                <td data-label="รหัส" className="px-4 py-3">
                  <Link href={`/admin/hr/${e.id}`} className="text-teal-800 hover:text-orange-600">
                    {e.employee_code}
                  </Link>
                </td>
                <td data-label="ชื่อ-นามสกุล" className="px-4 py-3 text-teal-950">
                  <Link href={`/admin/hr/${e.id}`} className="hover:text-orange-600">
                    {fullName(e)}
                  </Link>
                </td>
                <td data-label="ชื่อเล่น" className="px-4 py-3 text-teal-950">{e.nickname}</td>
                <td data-label="รหัสสแกน" className="px-4 py-3 text-teal-700">{e.scan_code}</td>
                <td data-label="แผนก / ตำแหน่ง" className="px-4 py-3 text-teal-700">
                  {e.department ?? "-"} / {e.position ?? "-"}
                </td>
                <td data-label="ประเภท" className="px-4 py-3 text-teal-700">
                  {EMPLOYMENT_TYPES[e.employment_type] ?? e.employment_type}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/hr/${e.id}`}
                      title="แก้ไข"
                      className="rounded-full border border-teal-200 p-1.5 text-teal-600 transition-colors hover:bg-teal-50"
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </Link>
                    <DeleteButton
                      action={deleteEmployee.bind(null, e.id)}
                      confirmMessage={`ลบพนักงาน "${e.first_name} ${e.last_name}"?`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-teal-400">
                  {active ? "ไม่พบพนักงานตามเงื่อนไขนี้" : "ยังไม่มีข้อมูลพนักงาน"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        total={filtered.length}
        page={current}
        size={size}
        onChange={(c) => {
          if (c.size !== undefined) setSize(c.size);
          setPage(c.page ?? 1);
        }}
      />
    </>
  );
}
