"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, type CSSProperties } from "react";
import { useMegaMenu } from "./MegaMenuProvider";
import { NAV_SECTIONS } from "./nav-sections";
import { POKEMON_SETS } from "@/lib/pokemon-sets";
import { Logo } from "./Logo";
import { SearchBar } from "./SearchBar";

// Full-screen, "movie-like" navigation overlay. Stays mounted and toggles via
// classes (so it can animate in AND out), mirroring WishlistDrawer's mechanics:
// scroll-lock, Escape, backdrop click, transform/opacity transitions — plus a
// focus trap and a ken-burns set-logo montage. Fully prefers-reduced-motion safe.
export function CinematicNavMenu() {
  const { open, setOpen } = useMegaMenu();
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Background montage: real set logos (static config → no DB / egress).
  const logos = POKEMON_SETS.filter((s) => s.logo).slice(0, 18);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }, 60);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, setOpen]);

  // Simple focus trap: loop Tab within the dialog while open.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const close = () => setOpen(false);

  return (
    <div aria-hidden={!open} className={`fixed inset-0 z-[95] ${open ? "" : "pointer-events-none"}`}>
      {/* Backdrop */}
      <div
        onClick={close}
        className={`absolute inset-0 bg-ink-950/85 backdrop-blur-xl transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />

      {/* Cinematic background: blurred ken-burns set-logo montage + aurora + scrim */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <div className={`absolute inset-0 grid grid-cols-3 place-items-center gap-10 p-12 opacity-[0.07] blur-[2px] sm:grid-cols-6 ${open ? "kenburns" : ""}`}>
          {logos.map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s.code} src={s.logo!} alt="" loading="lazy" className="max-h-16 w-full object-contain" />
          ))}
        </div>
        <div className="aurora-layer">
          <span className="aurora-blob" style={{ width: 420, height: 420, left: "8%", top: "-8%", background: "#ee1515", opacity: 0.28 }} />
          <span className="aurora-blob" style={{ width: 460, height: 460, right: "6%", top: "0%", background: "#ffcb05", opacity: 0.2, animationDelay: "-7s" }} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/50 via-transparent to-ink-950/85" />
      </div>

      {/* Content */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        onKeyDown={onKeyDown}
        className={`absolute inset-0 overflow-y-auto transition-all duration-300 ${open ? "cine-open scale-100 opacity-100 translate-y-0" : "scale-[0.98] opacity-0 translate-y-3"}`}
      >
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-4">
            <Link href="/" onClick={close} className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
              <Logo size={40} />
              <span className="font-display text-lg font-extrabold text-white">
                Dex<span className="text-brand-400">Compare</span>
              </span>
            </Link>
            <button
              type="button"
              data-autofocus
              onClick={close}
              aria-label="Close menu"
              className="rounded-lg border border-ink-700 bg-ink-900/70 px-3 py-2 text-sm font-semibold text-slate-300 outline-none transition-colors hover:border-brand-500 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              Close ✕
            </button>
          </div>

          {/* Search front-and-centre */}
          <div className="mx-auto mt-8 max-w-2xl">
            <Suspense fallback={<div className="input" />}>
              <SearchBar />
            </Suspense>
          </div>

          {/* Category panels (staggered on open) */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {NAV_SECTIONS.map((sec, si) => (
              <div
                key={sec.label}
                className="cine-item card-surface p-4"
                style={{ "--cine-delay": `${si * 70}ms` } as CSSProperties}
              >
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{sec.label}</div>
                <ul className="space-y-0.5">
                  {sec.links.map((l) => {
                    const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
                    return (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          onClick={close}
                          aria-current={active ? "page" : undefined}
                          className={`group flex items-center gap-3 rounded-lg px-2 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-400 ${
                            active ? "bg-brand-500/15 text-white" : "text-slate-300 hover:bg-ink-800 hover:text-white"
                          }`}
                        >
                          <span className="text-lg" aria-hidden>{l.icon}</span>
                          <span className="font-medium transition-transform group-hover:translate-x-0.5">{l.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Featured sets */}
          <div className="cine-item mt-8" style={{ "--cine-delay": `${NAV_SECTIONS.length * 70}ms` } as CSSProperties}>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Featured sets</div>
            <div className="edge-fade -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
              {logos.slice(0, 12).map((s) => (
                <Link
                  key={s.code}
                  href={`/sets/${s.slug}`}
                  onClick={close}
                  className="card-surface lift flex h-16 w-32 shrink-0 items-center justify-center p-3 outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.logo!} alt={s.name} loading="lazy" className="max-h-10 max-w-full object-contain" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
