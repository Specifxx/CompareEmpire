"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, type CSSProperties } from "react";
import { useMegaMenu } from "./MegaMenuProvider";
import { NAV_SECTIONS } from "./nav-sections";
import { POKEMON_SETS } from "@/lib/pokemon-sets";
import { Logo } from "./Logo";
import { SearchBar } from "./SearchBar";

// Vibrant per-section accents (solid colours + matching glow).
const ACCENTS = [
  { color: "#ee1515", text: "text-brand-300", glow: "0 0 22px rgba(238,21,21,0.55)" }, // Shop prices — red
  { color: "#ffcb05", text: "text-amber-300", glow: "0 0 22px rgba(255,203,5,0.55)" }, // Market — gold
  { color: "#e879f9", text: "text-fuchsia-300", glow: "0 0 22px rgba(232,121,249,0.55)" }, // My stuff — fuchsia
  { color: "#38bdf8", text: "text-sky-300", glow: "0 0 22px rgba(56,189,248,0.55)" }, // Play & tools — sky
  { color: "#34d399", text: "text-emerald-300", glow: "0 0 22px rgba(52,211,153,0.55)" }, // Learn & help — emerald
];

// Full-screen, "movie-like" navigation overlay — solid, vibrant, glowing. Stays
// mounted and toggles via classes (animates in AND out), mirroring WishlistDrawer:
// scroll-lock, Escape, backdrop/outside click, transform/opacity transitions —
// plus a focus trap. Fully prefers-reduced-motion safe.
export function CinematicNavMenu() {
  const { open, setOpen } = useMegaMenu();
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Featured-set tiles (static config → no DB / egress).
  const logos = POKEMON_SETS.filter((s) => s.logo).slice(0, 12);

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
      {/* Solid backdrop — no transparency, no blur. */}
      <div
        onClick={close}
        className={`absolute inset-0 bg-ink-950 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />

      {/* One big glow radiating FROM the centre panel, washing the whole width
          (left + right) — not discrete orbs on the sides. */}
      <div
        aria-hidden
        className={`absolute inset-0 transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`}
        style={{
          background:
            "radial-gradient(125% 95% at 50% 47%, rgba(238,21,21,0.50) 0%, rgba(255,113,67,0.30) 20%, rgba(255,203,5,0.14) 42%, rgba(10,12,16,0) 70%)",
        }}
      />

      {/* Content (click empty space to close) */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        onKeyDown={onKeyDown}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className={`absolute inset-0 overflow-y-auto p-4 transition-all duration-300 sm:p-8 ${open ? "cine-open scale-100 opacity-100 translate-y-0" : "scale-[0.98] opacity-0 translate-y-3"}`}
      >
        {/* The middle panel — solid, bordered, floating on a glowing gradient halo. */}
        <div className="relative mx-auto my-auto max-w-5xl">
          {/* Glowing animated halo behind the solid panel */}
          <div
            className="pointer-events-none absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-brand-500 via-accent to-gold opacity-70 blur-2xl animate-gradient-pan"
            style={{ backgroundSize: "200% 200%" }}
            aria-hidden
          />

          <div className="relative rounded-[1.6rem] border border-ink-700 bg-ink-900 p-5 shadow-glow-lg sm:p-8">
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
                className="rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm font-bold text-white outline-none transition-colors hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                Close ✕
              </button>
            </div>

            {/* Search front-and-centre */}
            <div className="mx-auto mt-6 max-w-2xl">
              <Suspense fallback={<div className="input" />}>
                <SearchBar />
              </Suspense>
            </div>

            {/* Category panels (vibrant accents, staggered on open) */}
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {NAV_SECTIONS.map((sec, si) => {
                const accent = ACCENTS[si % ACCENTS.length];
                return (
                  <div
                    key={sec.label}
                    className="cine-item relative overflow-hidden rounded-xl border border-ink-700 bg-ink-850 p-4"
                    style={{ "--cine-delay": `${si * 70}ms` } as CSSProperties}
                  >
                    {/* Vibrant glowing top bar */}
                    <span className="absolute inset-x-0 top-0 h-1" style={{ background: accent.color, boxShadow: accent.glow }} aria-hidden />
                    <div className={`mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide ${accent.text}`}>
                      <span className="h-2 w-2 rounded-full" style={{ background: accent.color, boxShadow: accent.glow }} aria-hidden />
                      {sec.label}
                    </div>
                    <ul className="space-y-0.5">
                      {sec.links.map((l) => {
                        const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
                        return (
                          <li key={l.href}>
                            <Link
                              href={l.href}
                              onClick={close}
                              aria-current={active ? "page" : undefined}
                              className={`group flex items-center gap-3 rounded-lg px-2 py-2 text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-brand-400 ${
                                active
                                  ? "bg-brand-500 font-semibold text-white shadow-glow"
                                  : "text-slate-200 hover:bg-ink-800 hover:text-white"
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
                );
              })}

              {/* Featured sets — solid glowing tiles */}
              <div
                className="cine-item relative overflow-hidden rounded-xl border border-ink-700 bg-ink-850 p-4"
                style={{ "--cine-delay": `${NAV_SECTIONS.length * 70}ms` } as CSSProperties}
              >
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: "#ffd23f", boxShadow: "0 0 22px rgba(255,210,63,0.55)" }} aria-hidden />
                <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-gold">
                  <span className="h-2 w-2 rounded-full bg-gold" style={{ boxShadow: "0 0 22px rgba(255,210,63,0.55)" }} aria-hidden />
                  Featured sets
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {logos.slice(0, 6).map((s) => (
                    <Link
                      key={s.code}
                      href={`/sets/${s.slug}`}
                      onClick={close}
                      className="flex h-12 items-center justify-center rounded-lg border border-ink-700 bg-ink-900 p-2 outline-none transition-all hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-glow focus-visible:ring-2 focus-visible:ring-brand-400"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.logo!} alt={s.name} loading="lazy" className="max-h-8 max-w-full object-contain" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
