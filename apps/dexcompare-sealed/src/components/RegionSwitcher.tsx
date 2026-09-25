"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { REGION_LIST, isRegion, type Region } from "@/lib/regions";

// Plain links, not a redirect: each region is its own set of pages. The same
// page in another region is the same path with the first segment swapped.
export function RegionSwitcher({ region }: { region: Region | null }) {
  const pathname = usePathname() || "/";
  const ref = useRef<HTMLDetailsElement>(null);
  const rest = (() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length && isRegion(parts[0])) parts.shift();
    return parts.length ? `/${parts.join("/")}` : "";
  })();
  const current = region ? REGION_LIST.find((r) => r.region === region) : null;

  useEffect(() => {
    if (region) {
      try {
        localStorage.setItem("dex-region", region);
      } catch {
        /* storage blocked — fine */
      }
    }
  }, [region]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary className="chip cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden" aria-label="Change region">
        <span aria-hidden="true">{current?.flag ?? "🌏"}</span>
        <span>{current?.short ?? "Region"}</span>
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-faint" aria-hidden="true">
          <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </summary>
      <div className="card absolute right-0 z-50 mt-2 w-60 p-1.5 shadow-lift">
        {REGION_LIST.map((r) => (
          <Link
            key={r.region}
            href={`/${r.region}${rest}`}
            onClick={() => ref.current && (ref.current.open = false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-raised ${r.region === region ? "font-semibold" : ""}`}
          >
            <span className="text-lg" aria-hidden="true">{r.flag}</span>
            <span className="flex-1">{r.name}</span>
            <span className="text-xs text-faint">{r.currency}</span>
          </Link>
        ))}
      </div>
    </details>
  );
}
