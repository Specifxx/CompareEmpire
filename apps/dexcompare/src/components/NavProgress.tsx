"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Slim top-of-page navigation progress bar (YouTube/GitHub style), dependency-
// free. Starts the INSTANT any internal link is clicked — covering the network
// round-trip before Next.js can show a loading boundary (most links here use
// prefetch={false}, so that gap is real) — trickles towards ~90%, and completes
// when the route actually changes. A true "percent loaded" isn't knowable for a
// navigation, so this uses the standard indeterminate-trickle pattern.
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const barRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failSafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const widthRef = useRef(0);

  // Complete the bar whenever the route (path or query) actually changes.
  useEffect(() => {
    if (!activeRef.current) return;
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  function setWidth(w: number, opacity = "1") {
    widthRef.current = w;
    const el = barRef.current;
    if (el) {
      el.style.width = `${w}%`;
      el.style.opacity = opacity;
    }
  }

  function clearTimers() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (failSafeRef.current) clearTimeout(failSafeRef.current);
    timerRef.current = null;
    failSafeRef.current = null;
  }

  function start() {
    clearTimers();
    activeRef.current = true;
    setWidth(8);
    // Trickle: fast at first, slowing as it approaches 90% — never completes
    // on its own.
    timerRef.current = setInterval(() => {
      const w = widthRef.current;
      const step = w < 30 ? 6 : w < 60 ? 3 : w < 85 ? 1 : 0.3;
      setWidth(Math.min(w + step, 90));
    }, 180);
    // Fail-safe: if the navigation never lands (aborted, error page handled
    // elsewhere), don't leave a stuck bar.
    failSafeRef.current = setTimeout(finish, 20_000);
  }

  function finish() {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    setWidth(100);
    setTimeout(() => {
      const el = barRef.current;
      if (el) el.style.opacity = "0";
      // Reset width after the fade so the next start doesn't animate backwards.
      setTimeout(() => setWidth(0, "0"), 220);
    }, 120);
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Only primary-button, unmodified clicks navigate in-tab.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || a.target === "_blank" || a.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same-page hash jumps and clicks on the current URL don't navigate.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5">
      <div
        ref={barRef}
        className="h-full bg-brand-400 shadow-[0_0_8px_rgba(248,113,113,0.7)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: "0%", opacity: 0 }}
      />
    </div>
  );
}
