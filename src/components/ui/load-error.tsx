"use client";

import { useEffect } from "react";
import { submitButtonClassName } from "@/lib/ui-classes";

/** Body of the back-office error pages: a page failed to load, most often
 * because Supabase couldn't be reached. "ลองใหม่" re-renders without a reload. */
export function LoadError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
      <h2 className="text-lg font-semibold text-orange-700">โหลดหน้านี้ไม่สำเร็จ</h2>
      <p className="mt-1 text-sm text-orange-700">
        อาจเป็นเพราะการเชื่อมต่อสะดุดชั่วคราว ข้อมูลที่บันทึกไว้แล้วไม่หาย กด &quot;ลองใหม่&quot; ได้เลย
      </p>
      <button type="button" onClick={() => retry()} className={`mt-4 ${submitButtonClassName}`}>
        ลองใหม่
      </button>
    </div>
  );
}
