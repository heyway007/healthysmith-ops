"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Thin loading bar across the top of the screen while a navigation is in
// flight. The App Router has no navigation events, so this starts on clicks
// on internal links (or startNavigationProgress() before a router.push) and
// finishes when the URL actually changes. Covers query-only changes (month,
// team, filters) that loading.tsx doesn't show for.

const START_EVENT = "nav-progress:start";

/** Call right before router.push()/replace() so the bar shows immediately. */
export function startNavigationProgress() {
  window.dispatchEvent(new Event(START_EVENT));
}

const currentUrl = () => window.location.pathname + window.location.search;

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const safety = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const start = () => {
      setState("loading");
      clearTimeout(safety.current);
      // Never leave the bar stuck if a navigation is cancelled or fails.
      safety.current = setTimeout(() => setState("idle"), 20_000);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === currentUrl()) return; // same page / hash link
      start();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener(START_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(START_EVENT, start);
    };
  }, []);

  // The URL changed → the new page is rendering: finish the bar. (Adjusting
  // state while rendering, per React's "storing information from previous renders".)
  const urlKey = `${pathname}?${searchParams.toString()}`;
  const [lastUrlKey, setLastUrlKey] = useState(urlKey);
  if (urlKey !== lastUrlKey) {
    setLastUrlKey(urlKey);
    if (state === "loading") setState("done");
  }

  // Once finished, fade out and reset.
  useEffect(() => {
    if (state !== "done") return;
    clearTimeout(safety.current);
    const t = setTimeout(() => setState("idle"), 350);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
      style={{ opacity: state === "idle" ? 0 : 1, transition: "opacity 300ms" }}
    >
      <div
        className="h-full bg-linear-to-r from-amber-400 via-orange-500 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]"
        style={{
          width: state === "idle" ? "0%" : state === "loading" ? "85%" : "100%",
          transition:
            state === "loading" ? "width 8s cubic-bezier(0.1, 0.8, 0.2, 1)" : state === "done" ? "width 200ms" : "none",
        }}
      />
    </div>
  );
}
