"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, COUNTRY_LIST } from "@/lib/country";
import { useCountry } from "./CountryProvider";

// Region selector: localises eBay/Amazon marketplace links, the indicative
// local-currency hint and the copy. Mirrors the sister sites' switcher UX.
export function CountrySwitcher({ className }: { className?: string }) {
  const { country, setCountry } = useCountry();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const info = COUNTRIES[country];

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Region: ${info.label}`}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-200 hover:bg-ink-800 hover:text-white"
      >
        <span className="text-base leading-none">{info.flag}</span>
        <span className="hidden sm:inline">{info.code}</span>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-60 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-2xl">
          <div className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Shopping from
          </div>
          <div className="flex flex-col gap-0.5 p-1.5">
            {COUNTRY_LIST.map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  setCountry(c.code);
                  setOpen(false);
                }}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left ${
                  c.code === country ? "bg-ink-800" : "hover:bg-ink-800"
                }`}
              >
                <span className="text-lg leading-none">{c.flag}</span>
                <span className="flex-1 text-sm font-medium text-white">{c.label}</span>
                <span className="text-xs text-slate-500">{c.currency}</span>
                {c.code === country && (
                  <svg className="h-4 w-4 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <p className="border-t border-ink-700 px-3 py-2 text-[11px] leading-snug text-slate-500">
            Localises eBay &amp; Amazon links and shows an indicative price in your currency.
          </p>
        </div>
      )}
    </div>
  );
}
