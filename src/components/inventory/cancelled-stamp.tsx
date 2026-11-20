/**
 * Red "ยกเลิก" stamp across the middle of a document. Put it inside a
 * `relative` box; it ignores clicks so the page underneath stays usable.
 */
export function CancelledStamp({ date, reason }: { date?: string; reason?: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
      aria-label="เอกสารนี้ถูกยกเลิกแล้ว"
    >
      <div className="-rotate-12 rounded-2xl border-[6px] border-double border-rose-600/75 px-10 py-3 text-center text-rose-600/75">
        <p className="text-6xl font-extrabold tracking-[0.3em] sm:text-7xl">ยกเลิก</p>
        <p className="mt-1 text-lg font-bold tracking-[0.4em]">CANCELLED</p>
        {date && <p className="mt-1 text-sm font-semibold">{date}</p>}
        {reason && <p className="mx-auto mt-1 max-w-[22rem] text-xs font-medium">{reason}</p>}
      </div>
    </div>
  );
}
