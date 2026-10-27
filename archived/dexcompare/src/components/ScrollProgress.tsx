"use client";

import { useEffect, useRef } from "react";

// Slim brand→accent reading-progress bar pinned to the top of the viewport.
// Pure transform on scroll (passive listener + rAF), so it never jank the page.
// Hidden under prefers-reduced-motion via the parent's CSS isn't needed — a
// static progress bar is unobtrusive — but we still throttle with rAF.
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? Math.min(1, doc.scrollTop / max) : 0;
      bar.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-0.5">
      <div
        ref={ref}
        className="h-full origin-left scale-x-0 bg-brand-500"
      />
    </div>
  );
}
