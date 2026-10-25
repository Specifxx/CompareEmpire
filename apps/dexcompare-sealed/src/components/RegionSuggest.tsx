"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { REGIONS, X_DEFAULT_REGION, isRegion, regionFromTimeZone, type Region } from "@/lib/regions";

/** Where the guess came from: a region the visitor browsed before, Vercel's geo header, Accept-Language, or the time zone. */
export type RegionSource = "saved" | "geo" | "language" | "timezone" | "picked";

let geoAnswer: Promise<{ region: Region | null; source: RegionSource | null }> | null = null;

/** /api/geo (Vercel's x-vercel-ip-country, else Accept-Language), asked once per page however many components want it. */
function askGeo(): Promise<{ region: Region | null; source: RegionSource | null }> {
  geoAnswer ??= fetch("/api/geo", { headers: { accept: "application/json" } })
    .then((r) => (r.ok ? (r.json() as Promise<{ region: string | null; source: RegionSource | null }>) : { region: null, source: null }))
    .then((j) => (isRegion(j.region) ? { region: j.region, source: j.source } : { region: null, source: null }))
    .catch(() => ({ region: null, source: null }));
  return geoAnswer;
}

/**
 * The landing page's guess at the visitor's region: the one they last browsed (RegionSwitcher remembers it), else their country
 * (Vercel's geo header, through /api/geo; Accept-Language when there is none), else their time zone. A suggestion, never a
 * redirect: the landing page stays the same crawlable HTML for everyone, and a traveller can pick another region. Unknown until
 * mount; the geo answer is waited for at most 1.2 s before the time zone stands in. Null when nothing maps to a region.
 */
export function useSuggestedRegion(): { known: boolean; region: Region | null; source: RegionSource | null } {
  const [s, setS] = useState<{ known: boolean; region: Region | null; source: RegionSource | null }>({ known: false, region: null, source: null });
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("dex-region");
    } catch {
      /* storage blocked */
    }
    if (isRegion(saved)) {
      setS({ known: true, region: saved, source: "saved" });
      return;
    }
    let tz: string | undefined;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      /* no Intl time zone */
    }
    const byZone = regionFromTimeZone(tz);
    let live = true;
    const fallback = window.setTimeout(() => live && setS({ known: true, region: byZone, source: byZone ? "timezone" : null }), 1200);
    askGeo().then((g) => {
      if (!live) return;
      window.clearTimeout(fallback);
      setS(g.region ? { known: true, region: g.region, source: g.source } : { known: true, region: byZone, source: byZone ? "timezone" : null });
    });
    return () => {
      live = false;
      window.clearTimeout(fallback);
    };
  }, []);
  return s;
}

/**
 * The hero's call to action, in a box of fixed height the page gives it (h-12). The server's HTML (and a visitor whose time zone
 * names no region) gets "Choose your region ↓", a jump to the region grid; once the region is known it becomes "Continue to
 * Australia →". A new element (keyed), not a reflowed one, so the swap is no layout shift, and the box is never empty.
 *
 * It also points the hero's plain GET search form (`formId`, server markup) at the suggested region's search, by changing its
 * action attribute only: the US until then, and when no region is suggested.
 */
export function RegionSuggest({ formId }: { formId?: string }) {
  const { region } = useSuggestedRegion();
  useEffect(() => {
    if (formId) document.getElementById(formId)?.setAttribute("action", `/${region ?? X_DEFAULT_REGION}/sealed`);
  }, [formId, region]);
  if (!region) {
    return (
      <a key="choose" href="#regions" className="btn-primary h-12 px-6 text-base shadow-lift">
        Choose your region <span aria-hidden="true">↓</span>
      </a>
    );
  }
  const r = REGIONS[region];
  return (
    <Link key="continue" href={`/${r.region}`} className="btn-primary h-12 px-6 text-base shadow-lift">
      <span aria-hidden="true">{r.flag}</span> Continue to {r.name} <span aria-hidden="true">→</span>
    </Link>
  );
}

/** "What we compare": each type is a link to its page in the suggested region (the US in the server's HTML and with no suggestion). */
export function SuggestedTypeLinks({ types, align = "center" }: { types: { slug: string; label: string }[]; align?: "center" | "start" }) {
  const { region } = useSuggestedRegion();
  const to = region ?? X_DEFAULT_REGION;
  return (
    <ul className={`flex flex-wrap gap-2 ${align === "center" ? "justify-center" : ""}`} aria-label={`Product types in ${REGIONS[to].inName}`}>
      {types.map((t) => (
        <li key={t.slug}>
          <Link href={`/${to}/type/${t.slug}`} prefetch={false} className="chip min-h-11">
            {t.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
