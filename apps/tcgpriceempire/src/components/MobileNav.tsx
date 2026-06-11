"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GAME_LIST } from "@/lib/games";

const LINKS = [
  { href: "/browse", label: "Browse all cards" },
  { href: "/sealed", label: "Sealed products" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
];

// Hamburger menu: the per-game hubs plus utility links (desktop shows the game
// switcher inline; small screens reach everything from here).
export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-lg text-slate-200 hover:bg-ink-800"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute right-2 top-14 z-50 w-60 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-2xl">
            <div className="border-b border-ink-700 p-1.5">
              <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Game hubs
              </div>
              {GAME_LIST.map((g) => (
                <Link
                  key={g.key}
                  href={`/${g.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-ink-800"
                >
                  <span className="text-base leading-none">{g.icon}</span>
                  <span className="text-sm font-medium text-white">{g.short}</span>
                </Link>
              ))}
            </div>
            <ul className="py-1">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-ink-800 hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
