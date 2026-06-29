"use client";

import { useMegaMenu } from "./MegaMenuProvider";

// Opens the full-screen cinematic nav. Solid + vibrant + glowing (no transparency).
//  - default: full-width "Explore everything" launcher.
//  - compact: a small ⌘K-style button for the top navbar.
export function NavLauncherButton({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const { setOpen } = useMegaMenu();

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className={`inline-flex items-center gap-2 rounded-md border border-ink-800 bg-ink-850 px-2.5 py-2 text-sm font-semibold text-white outline-none transition-colors hover:border-ink-600 hover:bg-ink-800 focus-visible:ring-2 focus-visible:ring-brand-400 ${className}`}
      >
        <span className="hidden sm:inline">Explore</span>
        <kbd className="hidden rounded bg-ink-950 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 md:inline">⌘K</kbd>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`group relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-lg bg-brand-500 px-3 py-2.5 text-left text-white outline-none transition-colors hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-400 ${className}`}
    >
      <span className="flex items-center gap-2">
        <span className="text-sm font-extrabold">Explore everything</span>
      </span>
      <kbd className="rounded bg-ink-950/40 px-1.5 py-0.5 text-[10px] font-bold text-white/80">⌘K</kbd>
    </button>
  );
}
