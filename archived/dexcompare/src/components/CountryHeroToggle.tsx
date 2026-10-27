"use client";

import { COUNTRY_LIST, INTL_ENABLED } from "@/lib/country";
import { useCountry } from "./CountryProvider";

// Prominent market chooser for the homepage hero. Compact on phones (flag +
// code only, tighter padding — the full-name pills were eating half the hero);
// full labels + currency from the sm breakpoint up.
export function CountryHeroToggle() {
  const { country, setCountry } = useCountry();
  if (!INTL_ENABLED) return null;

  return (
    <div className="mt-4 flex flex-col items-center gap-1.5 sm:mt-6 sm:gap-2">
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs sm:text-slate-400">
        Shopping from
      </span>
      <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-ink-800 bg-ink-900 p-1 sm:gap-1.5 sm:p-1.5">
        {COUNTRY_LIST.map((c) => {
          const active = c.code === country;
          return (
            <button
              key={c.code}
              onClick={() => setCountry(c.code)}
              aria-pressed={active}
              aria-label={c.label}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors sm:gap-1.5 sm:px-3.5 sm:py-2 sm:text-sm ${
                active
                  ? "bg-brand-500 text-white"
                  : "text-slate-300 hover:bg-ink-800 hover:text-white"
              }`}
            >
              <span className="text-sm leading-none sm:text-base">{c.flag}</span>
              <span className="sm:hidden">{c.code}</span>
              <span className="hidden sm:inline">{c.label}</span>
              <span className={`hidden text-[10px] sm:inline ${active ? "text-white/80" : "text-slate-500"}`}>{c.currency}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
