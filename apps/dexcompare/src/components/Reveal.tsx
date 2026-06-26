"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

// Scroll-reveal wrapper. Adds the `in-view` class (which the CSS in globals.css
// animates) the first time the element scrolls into view. Content is fully
// visible without JS / under prefers-reduced-motion (handled in CSS), so this is
// purely additive polish — never hides content from crawlers.
export function Reveal({
  children,
  className = "",
  delay = 0,
  zoom = false,
  as: Tag = "div",
  amount = 0.12,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  zoom?: boolean;
  as?: ElementType;
  amount?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    // If IntersectionObserver is unavailable, just show immediately.
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: amount, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, amount]);

  return (
    <Tag
      ref={ref as never}
      className={`reveal${zoom ? " reveal-zoom" : ""}${shown ? " in-view" : ""} ${className}`}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
