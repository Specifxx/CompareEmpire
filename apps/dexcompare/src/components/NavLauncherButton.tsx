"use client";

import { useMegaMenu } from "./MegaMenuProvider";

// Opens the full-screen cinematic nav. Two looks:
//  - default: full-width "Explore everything" launcher for the left rail.
//  - compact: a small ⌘K-style button for the top navbar (where the rail isn't).
export function NavLauncherButton({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const { setOpen } = useMegaMenu();

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className={`inline-flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/70 px-2.5 py-2 text-sm font-medium text-slate-300 outline-none transition-colors hover:border-brand-500 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-400 ${className}`}
      >
        <span aria-hidden>✨</span>
        <span className="hidden sm:inline">Explore</span>
        <kbd className="hidden rounded bg-ink-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 md:inline">⌘K</kbd>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`shine group relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-xl border border-brand-500/40 bg-gradient-to-br from-brand-600/20 via-ink-850 to-gold/10 px-3 py-2.5 text-left shadow-glow outline-none transition-all hover:-translate-y-0.5 hover:shadow-glow-lg focus-visible:ring-2 focus-visible:ring-brand-400 ${className}`}
    >
      <span className="flex items-center gap-2">
        <span className="text-base" aria-hidden>✨</span>
        <span className="text-gradient animate-gradient-pan text-sm font-extrabold">Explore everything</span>
      </span>
      <kbd className="rounded bg-ink-900/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">⌘K</kbd>
    </button>
  );
}
