"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NAV_SECTIONS } from "./nav-sections";

// Desktop "Menu" — the same grouped app-launcher organisation as the phone
// sheet (labelled sections, icon tiles), rendered as a wide dropdown panel.
// Replaces the old flat "More" list plus the loose Trade/Games tabs, so the
// desktop and mobile menus are one system fed by NAV_SECTIONS.
export function NavMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-200 hover:bg-ink-800 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v7H4zM13 14h7v7h-7z" />
        </svg>
        Menu
        <svg className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[620px] rounded-xl border border-ink-700 bg-ink-900 p-4 shadow-2xl">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {NAV_SECTIONS.map((s) => (
              <div key={s.label}>
                <div className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {s.label}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {s.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-lg bg-ink-800/70 px-2.5 py-2.5 text-[13px] font-medium text-slate-200 hover:bg-ink-800 hover:text-white"
                    >
                      <span className="text-base leading-none" aria-hidden>{l.icon}</span>
                      <span className="truncate">{l.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
