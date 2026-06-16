"use client";

import { useEffect } from "react";

// Mount once on a page: reveals any element with the `.reveal` class as it scrolls
// into view (adds `.is-visible`, which the CSS animates). Uses a single
// IntersectionObserver, re-scans after mount so it also catches server-rendered
// content, and honours prefers-reduced-motion (reveals everything immediately).
export function ScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!els.length) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );

    els.forEach((el) => {
      // Anything already on-screen at load reveals right away (no flash).
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) el.classList.add("is-visible");
      else io.observe(el);
    });

    return () => io.disconnect();
  }, []);

  return null;
}
