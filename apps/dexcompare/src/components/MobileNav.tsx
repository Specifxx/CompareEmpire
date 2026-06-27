"use client";

import { useMegaMenu } from "./MegaMenuProvider";

// On phones/tablets the hamburger opens the same full-screen cinematic menu as
// the desktop launcher — one immersive nav everywhere. (Country switching lives
// in the navbar's CountrySwitcher.)
export function MobileNav() {
  const { setOpen } = useMegaMenu();
  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="grid h-9 w-9 place-items-center rounded-lg text-slate-200 outline-none transition-colors hover:bg-ink-800 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
    </div>
  );
}
