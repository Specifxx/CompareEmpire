"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COUNTRY_LIST, INTL_ENABLED } from "@/lib/country";
import { useCountry } from "./CountryProvider";

// Grouped, app-style mobile menu. The old version was a 14-row wall with four
// full-width country rows on top — taller than a phone screen and unscannable.
// Now: one compact flag row, then labelled sections rendered as 2-column tiles
// with icons, scrollable inside a viewport-capped sheet.
const SECTIONS: { label: string; links: { href: string; icon: string; label: string }[] }[] = [
  {
    label: "Shop prices",
    links: [
      { href: "/browse", icon: "🃏", label: "Card database" },
      { href: "/sealed", icon: "📦", label: "Sealed" },
      { href: "/deals", icon: "🔥", label: "Deals" },
      { href: "/card-value", icon: "💰", label: "Value checker" },
    ],
  },
  {
    label: "Market",
    links: [
      { href: "/market", icon: "📈", label: "DexCompare Index" },
      { href: "/restock", icon: "📅", label: "Drops & restocks" },
    ],
  },
  {
    label: "My stuff",
    links: [
      { href: "/wishlist", icon: "❤️", label: "Wishlist" },
      { href: "/collection", icon: "📚", label: "Collection" },
      { href: "/trade", icon: "⚖️", label: "Trade calc" },
      { href: "/games", icon: "🕹️", label: "Minigames" },
    ],
  },
  {
    label: "Learn & help",
    links: [
      { href: "/guides", icon: "📖", label: "Buying guides" },
      { href: "/blog", icon: "✍️", label: "Blog" },
      { href: "/contact", icon: "✉️", label: "Contact" },
    ],
  },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { country, setCountry } = useCountry();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="lg:hidden">
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
          <div className="absolute right-2 top-14 z-50 max-h-[80vh] w-[300px] overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 shadow-2xl">
            {/* Country: one compact row of flag pills instead of four full rows. */}
            {INTL_ENABLED && (
              <div className="border-b border-ink-700 p-2.5">
                <div className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Shop &amp; prices for
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {COUNTRY_LIST.map((c) => {
                    const active = c.code === country;
                    return (
                      <button
                        key={c.code}
                        onClick={() => setCountry(c.code)}
                        aria-pressed={active}
                        aria-label={c.label}
                        className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-semibold ${
                          active ? "bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/50" : "bg-ink-800 text-slate-300"
                        }`}
                      >
                        <span className="text-base leading-none">{c.flag}</span>
                        {c.code}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Grouped 2-column tiles — scannable, app-like, half the height. */}
            <div className="p-2.5">
              {SECTIONS.map((s) => (
                <div key={s.label} className="mb-2.5 last:mb-0">
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
        </>
      )}
    </div>
  );
}
