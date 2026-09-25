"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { REGIONS, isRegion, regionFromTimeZone, type Region } from "@/lib/regions";

// A suggestion, never a redirect: the landing page stays crawlable and a
// traveller can still pick another region.
export function RegionSuggest() {
  const [region, setRegion] = useState<Region | null>(null);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("dex-region");
    } catch {
      /* storage blocked */
    }
    if (isRegion(saved)) return setRegion(saved);
    setRegion(regionFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone));
  }, []);
  if (!region) return <div className="h-12" />;
  const r = REGIONS[region];
  return (
    <Link href={`/${r.region}`} className="btn-primary px-6 py-3 text-base shadow-lift">
      <span aria-hidden="true">{r.flag}</span> Continue to {r.name} <span aria-hidden="true">→</span>
    </Link>
  );
}
