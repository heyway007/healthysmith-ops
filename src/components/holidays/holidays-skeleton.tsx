import { HOLIDAY_THEMES } from "./holiday-views";

// Placeholder shown by loading.tsx while the holidays page streams in.
export function HolidaysSkeleton({ variant }: { variant: keyof typeof HOLIDAY_THEMES }) {
  const theme = HOLIDAY_THEMES[variant];
  const bar = "animate-pulse rounded-lg bg-gray-200/80";

  return (
    <div className="space-y-5" aria-busy="true" aria-label="กำลังโหลดปฏิทินวันหยุด">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="mr-auto space-y-2">
          <div className={`h-9 w-56 ${bar}`} />
          <div className={`h-4 w-72 ${bar}`} />
        </div>
        <div className={`h-12 w-60 ${bar}`} />
        <div className={`h-10 w-52 ${bar}`} />
      </div>
      <div className="flex flex-wrap gap-3">
        <div className={`h-10 w-56 ${bar}`} />
        <div className={`h-10 w-52 ${bar}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className={`overflow-hidden ${theme.card}`}>
          <div className={`h-10 border-b ${theme.divider} ${theme.headerRow}`} />
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }, (_, i) => (
              <div
                key={i}
                className={`min-h-14 border-b p-2.5 sm:min-h-24 ${i % 7 !== 6 ? "border-r" : ""} ${theme.divider}`}
              >
                <div className={`h-4 w-5 ${bar}`} />
              </div>
            ))}
          </div>
        </div>
        <div className={`space-y-4 p-5 ${theme.card}`}>
          <div className={`h-6 w-40 ${bar}`} />
          <div className={`h-40 ${bar}`} />
        </div>
      </div>

      <p className={`text-center text-sm ${theme.muted}`}>กำลังโหลด...</p>
    </div>
  );
}
