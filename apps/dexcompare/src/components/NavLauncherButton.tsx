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
        className={`inline-flex items-center gap-2 rounded-lg border border-brand-500/50 bg-ink-800 px-2.5 py-2 text-sm font-semibold text-white shadow-glow outline-none transition-colors hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-400 ${className}`}
      >
        <span aria-hidden>✨</span>
        <span className="hidden sm:inline">Explore</span>
        <kbd className="hidden rounded bg-ink-950/60 px-1.5 py-0.5 text-[10px] font-bold text-white/80 md:inline">⌘K</kbd>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`shine group relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 px-3 py-2.5 text-left text-white shadow-glow outline-none transition-all hover:-translate-y-0.5 hover:shadow-glow-lg focus-visible:ring-2 focus-visible:ring-brand-400 ${className}`}
    >
      <span className="flex items-center gap-2">
        <span className="text-base" aria-hidden>✨</span>
        <span className="text-sm font-extrabold">Explore everything</span>
      </span>
      <kbd className="rounded bg-ink-950/60 px-1.5 py-0.5 text-[10px] font-bold text-white/80">⌘K</kbd>
    </button>
  );
}
