"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExcel, faFileArrowUp, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { formCardClassName, submitButtonClassName } from "@/lib/ui-classes";
import {
  WEEKDAY_TH,
  buildDayBlocks,
  buildMonth,
  fmtDuration,
  fmtShortDate,
  fmtTime,
  monthLabel,
  monthsOf,
  parseClock,
  parseFingerScan,
  totalsOf,
  type ParsedLog,
} from "@/lib/finger-scan";

const STORE_KEY = "hs-finger-scan-v1";
type Saved = { names: Record<string, string>; notes: Record<string, string>; start: string; rate: number };

function loadSaved(): Saved {
  const empty: Saved = { names: {}, notes: {}, start: "09:00", rate: 5 };
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return empty;
    return { ...empty, ...(JSON.parse(raw) as Partial<Saved>) };
  } catch {
    return empty;
  }
}

const inputClass =
  "rounded-lg border border-teal-300 bg-white px-2 py-1.5 text-sm text-teal-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100";

export function TimesheetViewer({ nameHints, roster }: { nameHints: string[]; roster: Record<number, string> }) {
  const [fileName, setFileName] = useState("");
  const [log, setLog] = useState<ParsedLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState("");
  // Starts from the defaults so server and client markup match; the browser's
  // stored names / notes / settings are read in when a file is chosen (or on the
  // first edit), and localStorage stays the source of truth until then.
  const [saved, setSaved] = useState<Saved>({ names: {}, notes: {}, start: "09:00", rate: 5 });
  const loaded = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [showAbsent, setShowAbsent] = useState(true);
  const [exporting, setExporting] = useState(false);

  const update = (fn: (s: Saved) => Partial<Saved>) => {
    const base = loaded.current ? saved : loadSaved();
    loaded.current = true;
    const next = { ...base, ...fn(base) };
    setSaved(next);
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked -- the page still works, it just won't remember */
    }
  };

  const startSec = parseClock(saved.start);
  const rate = Number.isFinite(saved.rate) && saved.rate >= 0 ? saved.rate : 0;
  // Names set on the employee form win; the rest are typed here.
  const nameOf = (id: number) => roster[id] ?? saved.names[id] ?? "";

  const onFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("ไฟล์ใหญ่เกิน 5MB");
      return;
    }
    const parsed = parseFingerScan(await file.text());
    if (parsed.scans.length === 0) {
      setLog(null);
      setError("ไม่พบรายการสแกนในไฟล์นี้ — ใช้ไฟล์ .txt ที่ export จากโปรแกรมเครื่องสแกนนิ้ว");
      return;
    }
    loaded.current = true;
    setSaved(loadSaved());
    setFileName(file.name);
    setLog(parsed);
    setMonth(monthsOf(parsed.scans).at(-1) ?? "");
  };

  const months = useMemo(() => (log ? monthsOf(log.scans) : []), [log]);
  const allIds = useMemo(() => (log ? [...new Set(log.scans.map((s) => s.id))].sort((a, b) => a - b) : []), [log]);
  const sheet = useMemo(() => (log && month ? buildMonth(log.scans, month) : null), [log, month]);
  const blocks = useMemo(() => (sheet ? buildDayBlocks(sheet, allIds, startSec) : []), [sheet, allIds, startSec]);
  const totals = useMemo(() => (sheet ? sheet.employees.map((e) => totalsOf(e, startSec)) : []), [sheet, startSec]);

  const setNote = (key: string, value: string) => update((s) => ({ notes: { ...s.notes, [key]: value } }));

  const exportExcel = async () => {
    if (!sheet) return;
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("ตารางเวลา", { views: [{ state: "frozen", ySplit: 1 }] });
      ws.columns = [
        { header: "Date", key: "date", width: 12 },
        { header: "Code", key: "code", width: 8 },
        { header: "name", key: "name", width: 16 },
        { header: "In", key: "in", width: 9 },
        { header: "Out", key: "out", width: 9 },
        { header: "Late", key: "late", width: 9 },
        { header: "หมายเหตุ", key: "note", width: 28 },
      ];
      const head = ws.getRow(1);
      head.font = { bold: true };
      head.alignment = { horizontal: "center" };
      head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2F1" } };
      const red = { color: { argb: "FFC00000" } };
      const edge = { style: "thin" as const, color: { argb: "FF999999" } };
      for (const b of blocks) {
        const sep = ws.addRow({ date: fmtShortDate(b.date) });
        sep.eachCell({ includeEmpty: true }, (c) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
        });
        for (const r of b.rows) {
          const row = ws.addRow({
            code: r.id,
            name: nameOf(r.id),
            in: fmtTime(r.in),
            out: fmtTime(r.out),
            late: r.late > 0 ? r.late * rate : "",
            note: r.late > 0 ? `สาย ${r.late} นาที` : r.in == null || r.out == null ? "สแกนไม่ครบ" : "",
          });
          if (r.late > 0) {
            row.getCell("in").font = red;
            row.getCell("late").font = red;
            row.getCell("note").font = { ...red, bold: true };
          }
        }
        if (showAbsent) {
          for (const id of b.absent) {
            const row = ws.addRow({ code: id, name: nameOf(id), note: saved.notes[`${b.date}|${id}`] || "ไม่มีการสแกน" });
            row.getCell("note").font = { ...red, bold: true };
          }
        }
      }
      ws.eachRow((row) => {
        row.eachCell({ includeEmpty: true }, (c) => {
          c.border = { top: edge, bottom: edge, left: edge, right: edge };
        });
        for (const k of ["code", "in", "out", "late"]) row.getCell(k).alignment = { horizontal: "center" };
      });

      const sum = wb.addWorksheet("สรุปรายคน", { views: [{ state: "frozen", ySplit: 1 }] });
      sum.columns = [
        { header: "Code", key: "code", width: 8 },
        { header: "name", key: "name", width: 16 },
        { header: "วันที่มา", key: "days", width: 10 },
        { header: "สแกนไม่ครบ (วัน)", key: "inc", width: 18 },
        { header: "สาย (วัน)", key: "lateDays", width: 12 },
        { header: "สาย (นาที)", key: "lateMin", width: 12 },
        { header: "หักสาย (บาท)", key: "baht", width: 14 },
        { header: "ชม.ทำงานรวม", key: "hours", width: 14 },
      ];
      sum.getRow(1).font = { bold: true };
      sum.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2F1" } };
      for (const t of totals) {
        sum.addRow({
          code: t.id,
          name: nameOf(t.id),
          days: t.daysPresent,
          inc: t.incomplete,
          lateDays: t.lateDays,
          lateMin: t.lateMinutes,
          baht: t.lateMinutes * rate,
          hours: fmtDuration(t.workedSec),
        });
      }

      const buf = await wb.xlsx.writeBuffer();
      const url = URL.createObjectURL(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `ตารางเวลาสแกนนิ้ว ${monthLabel(month)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <datalist id="finger-name-hints">
        {nameHints.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <div className={formCardClassName}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">1. เลือกไฟล์สแกนนิ้ว (.txt)</h3>
        {/* Native file input hidden: only the button opens the picker, not the whole row. */}
        <input
          ref={fileInput}
          type="file"
          accept=".txt,text/plain"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = ""; // choosing the same file again should still fire
          }}
          className="hidden"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="rounded-lg bg-teal-100 px-4 py-2 text-sm font-medium text-teal-800 transition-colors hover:bg-teal-200"
          >
            เลือกไฟล์
          </button>
          <span className="text-sm text-teal-700">{fileName || "ยังไม่ได้เลือกไฟล์"}</span>
        </div>
        <p className="mt-2 text-xs text-teal-500">ประมวลผลในเครื่องของคุณ — ไฟล์ไม่ถูกอัปโหลดหรือบันทึกลงระบบ</p>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-teal-500">2. เกณฑ์มาสาย</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium text-teal-800">
            เวลาเข้างาน
            <input
              type="time"
              value={saved.start}
              onChange={(e) => update(() => ({ start: e.target.value }))}
              className={`${inputClass} mt-1 block w-full`}
            />
          </label>
          <label className="block text-sm font-medium text-teal-800">
            หักนาทีละ (บาท)
            <input
              type="number"
              min={0}
              step="0.5"
              value={saved.rate}
              onChange={(e) => update(() => ({ rate: Number(e.target.value) }))}
              className={`${inputClass} mt-1 block w-full`}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-teal-800">
            <input type="checkbox" checked={showAbsent} onChange={(e) => setShowAbsent(e.target.checked)} />
            แสดงคนที่ไม่มีการสแกนในวันนั้น
          </label>
        </div>
        <p className="mt-2 text-xs text-teal-500">
          สแกนก่อนเที่ยง = เวลาเข้า (ครั้งแรกของวัน) · สแกนตั้งแต่เที่ยง = เวลาออก (ครั้งสุดท้ายของวัน) · สายนับเป็นนาทีเต็ม ไม่นับวินาที
        </p>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-700">
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
          {error}
        </p>
      )}

      {!log && !error && (
        <p className="flex items-center gap-2 text-sm text-teal-500">
          <FontAwesomeIcon icon={faFileArrowUp} />
          เลือกไฟล์เพื่อแปลงเป็นตารางเวลา
        </p>
      )}

      {log && sheet && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-teal-700">
                {fileName} · {log.scans.length.toLocaleString()} รายการสแกน · {allIds.length} คน
                {log.duplicates > 0 && ` · ตัดรายการซ้ำ ${log.duplicates}`}
                {log.skipped > 0 && ` · อ่านไม่ได้ ${log.skipped} บรรทัด`}
              </p>
              {months.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {months.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMonth(m)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        m === month
                          ? "border-teal-600 bg-teal-50 font-medium text-teal-900 ring-2 ring-teal-100"
                          : "border-teal-200 bg-white text-teal-700 hover:bg-teal-50"
                      }`}
                    >
                      {monthLabel(m)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={exportExcel}
              disabled={exporting}
              className={`${submitButtonClassName} inline-flex items-center gap-2 disabled:opacity-70`}
            >
              <FontAwesomeIcon icon={faFileExcel} />
              {exporting ? "กำลังสร้างไฟล์..." : "ดาวน์โหลด Excel"}
            </button>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-teal-950">ตารางเวลา — {monthLabel(month)}</h3>
            <p className="mt-1 text-xs text-teal-500">
              ชื่อมาจากรหัสสแกนนิ้วที่ตั้งในหน้ารายชื่อพนักงาน — รหัสที่ยังไม่ตั้ง พิมพ์ชื่อเล่นในช่อง name ได้ (จำไว้ในเบราว์เซอร์นี้) · คนที่ไม่สแกนพิมพ์เหตุผลลาในช่องหมายเหตุได้ เช่น ลาป่วย
            </p>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-xs font-medium text-teal-700">
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-center">Code</th>
                    <th className="px-3 py-2 text-left">name</th>
                    <th className="px-3 py-2 text-center">In</th>
                    <th className="px-3 py-2 text-center">Out</th>
                    <th className="px-3 py-2 text-center">Late</th>
                    <th className="px-3 py-2 text-left">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((b) => (
                    <Fragment key={b.date}>
                      <tr className="bg-slate-200 text-teal-950">
                        <td colSpan={7} className="px-3 py-1.5 font-medium">
                          {fmtShortDate(b.date)}
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            ({WEEKDAY_TH[b.weekday]}) · มา {b.rows.length} คน
                          </span>
                        </td>
                      </tr>
                      {b.rows.map((r) => (
                        <tr key={r.id} className="border-t border-teal-100 hover:bg-teal-50/50">
                          <td />
                          <td className="px-3 py-1.5 text-center text-teal-800">{r.id}</td>
                          <td className="px-3 py-1.5">
                            <NameInput fixed={roster[r.id]} value={nameOf(r.id)} onChange={(v) => update((s) => ({ names: { ...s.names, [r.id]: v } }))} />
                          </td>
                          <td className={`px-3 py-1.5 text-center tabular-nums ${r.late > 0 ? "text-red-600" : "text-teal-900"}`}>
                            {fmtTime(r.in) || "-"}
                          </td>
                          <td className="px-3 py-1.5 text-center tabular-nums text-teal-900">{fmtTime(r.out) || "-"}</td>
                          <td className="px-3 py-1.5 text-center tabular-nums text-red-600">{r.late > 0 ? r.late * rate : ""}</td>
                          <td className="px-3 py-1.5 text-xs font-semibold">
                            {r.late > 0 ? (
                              <span className="text-red-600">สาย {r.late} นาที</span>
                            ) : r.in == null || r.out == null ? (
                              <span className="text-amber-600">{r.in == null ? "ไม่มีเวลาเข้า" : "ไม่มีเวลาออก"}</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                      {showAbsent &&
                        b.absent.map((id) => {
                          const key = `${b.date}|${id}`;
                          return (
                            <tr key={id} className="border-t border-teal-100 bg-slate-50/70">
                              <td />
                              <td className="px-3 py-1.5 text-center text-slate-400">{id}</td>
                              <td className="px-3 py-1.5">
                                <NameInput fixed={roster[id]} value={nameOf(id)} onChange={(v) => update((s) => ({ names: { ...s.names, [id]: v } }))} />
                              </td>
                              <td colSpan={3} className="px-3 py-1.5 text-center text-xs text-slate-400">
                                ไม่มีการสแกน
                              </td>
                              <td className="px-3 py-1">
                                <textarea
                                  rows={1}
                                  value={saved.notes[key] ?? ""}
                                  onChange={(e) => setNote(key, e.target.value)}
                                  placeholder="เช่น ลาป่วย"
                                  className={`${inputClass} w-full resize-y text-xs font-semibold text-red-600`}
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-teal-950">สรุปรายคน — {monthLabel(month)}</h3>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-xs font-medium text-teal-700">
                    <th className="px-3 py-2 text-center">Code</th>
                    <th className="px-3 py-2 text-left">name</th>
                    <th className="px-3 py-2 text-right">วันที่มา</th>
                    <th className="px-3 py-2 text-right">สแกนไม่ครบ</th>
                    <th className="px-3 py-2 text-right">สาย (วัน)</th>
                    <th className="px-3 py-2 text-right">สาย (นาที)</th>
                    <th className="px-3 py-2 text-right">หักสาย (บาท)</th>
                    <th className="px-3 py-2 text-right">ชม.ทำงาน</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.map((t) => (
                    <tr key={t.id} className="border-t border-teal-100">
                      <td className="px-3 py-1.5 text-center text-teal-800">{t.id}</td>
                      <td className="px-3 py-1.5 text-teal-950">{nameOf(t.id) || "-"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{t.daysPresent}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-amber-600">{t.incomplete || ""}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-red-600">{t.lateDays || ""}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-red-600">{t.lateMinutes || ""}</td>
                      <td className="px-3 py-1.5 text-right font-medium tabular-nums text-red-600">
                        {t.lateMinutes ? (t.lateMinutes * rate).toLocaleString() : ""}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-teal-800">{fmtDuration(t.workedSec)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NameInput({ value, fixed, onChange }: { value: string; fixed?: string; onChange: (v: string) => void }) {
  if (fixed) return <span className="px-1.5 text-teal-950">{fixed}</span>;
  return (
    <input
      list="finger-name-hints"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="ชื่อเล่น"
      className="w-28 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm text-teal-950 placeholder:text-teal-300 hover:border-teal-200 focus:border-teal-500 focus:bg-white focus:outline-none"
    />
  );
}
