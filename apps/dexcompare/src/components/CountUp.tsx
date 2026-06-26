"use client";

import { useEffect, useRef, useState } from "react";

// Animated number that counts up from 0 to `value` the first time it scrolls
// into view. Renders the final value immediately when JS is off, the number is
// tiny, or the user prefers reduced motion — so the real figure is always in the
// DOM for SEO/accessibility.
export function CountUp({
  value,
  durationMs = 1100,
  className = "",
  format = (n: number) => n.toLocaleString(),
}: {
  value: number;
  durationMs?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(() => format(value));
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || started.current) return;
    const reduce =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || value <= 0 || typeof IntersectionObserver === "undefined") {
      setDisplay(format(value));
      return;
    }
    // Start at 0 only once we know we'll animate.
    setDisplay(format(0));
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || started.current) return;
        started.current = true;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          // easeOutCubic
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(format(Math.round(eased * value)));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
