"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { REGION_LIST, REGIONS, isRegion, X_DEFAULT_REGION, type Region } from "@/lib/regions";
import { SETS } from "@/lib/sets";
import { sectionHref } from "@/lib/site";
import { EbayStrip } from "./EbayStrip";
import { Icon } from "./Icon";
import { Glyph, MENU_ROWS } from "./MobileMenu";
import { Flag } from "@/components/Flag";

/** "2026-11-06" → "6 Nov 2026": the set's release date as sets.ts records it (no "out" or "released": the page is built once). */
function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** The region a 404's URL is under ("/au/p/nope" → "au"), or null. The 404 is prerendered once for every URL, so it is read after mount. */
function usePathRegion(): { known: boolean; region: Region | null } {
  const [s, setS] = useState<{ known: boolean; region: Region | null }>({ known: false, region: null });
  useEffect(() => {
    const seg = window.location.pathname.split("/")[1]?.toLowerCase();
    setS({ known: true, region: isRegion(seg) ? seg : null });
  }, []);
  return s;
}

/**
 * The 404's ways out, for the region in its URL: the search form (a plain GET form, so it works before and without script: the
 * server's HTML searches the US and the browser switches its action), the site's sections (the phone menu's rows) and the latest
 * sets in that region, and the region chips with the URL's region marked. Everything that changes after mount is an href, an
 * attribute, a colour or the region's name in one short line: nothing moves.
 */
export function NotFoundSearch() {
  const { region: inPath } = usePathRegion();
  const region = inPath ?? X_DEFAULT_REGION;
  const r = REGIONS[region];
  return (
    <>
      <form
        action={`/${region}/sealed`}
        method="get"
        role="search"
        className="mx-auto mt-8 flex min-h-14 max-w-xl items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-5 shadow-lift transition-[border-color,box-shadow] duration-200 focus-within:border-brand/70 focus-within:shadow-[0_0_0_4px_rgb(var(--brand)/0.14)]"
      >
        <Icon name="search" size={18} className="text-faint" />
        <input
          name="q"
          type="search"
          placeholder="Search a set or product"
          aria-label="Search sealed products"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-faint sm:text-sm"
        />
        <button type="submit" className="btn-primary min-h-10 px-4">
          Search
        </button>
      </form>
      <p className="mt-3 text-xs text-muted">
        <Flag code={r.short} /> Searches stores in {r.inName}
      </p>
      <h2 className="eyebrow mt-12">Where to next</h2>
      <ul className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2">
        {MENU_ROWS.map((row) => (
          <li key={row.key}>
            <Link
              href={sectionHref(region, row.key)}
              prefetch={false}
              className="chip group min-h-10"
            >
              <span className="flex shrink-0 items-center justify-center text-muted group-hover:text-ink [&>svg]:h-4 [&>svg]:w-4">
                <Glyph name={row.glyph} />
              </span>
              {row.label}
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="eyebrow mt-12">Latest sets</h2>
      <ul className="mx-auto mt-4 grid max-w-3xl grid-cols-2 gap-2.5 text-left sm:grid-cols-3 sm:gap-3">
        {SETS.slice(0, 6).map((s) => (
          <li key={s.slug} className="flex">
            <Link href={`/${region}/sets/${s.slug}`} prefetch={false} className="tile flex min-h-14 flex-1 flex-col justify-center px-4 py-3">
              <span className="text-sm font-semibold leading-snug">{s.name}</span>
              <span className="text-xs text-muted">{shortDate(s.releaseDate)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="eyebrow mt-12">Or pick your region</h2>
      <ul className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
        {REGION_LIST.map((x) => (
          <li key={x.region}>
            <Link href={`/${x.region}`} aria-current={x.region === inPath ? "true" : undefined} className={`chip min-h-10 ${x.region === inPath ? "chip-on" : ""}`}>
              <Flag code={x.short} /> {x.name}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * The 404's one eBay unit: a slim listing strip (sealed Pokémon), or the compact CTA when there are none. A 404 under
 * /au/..., /uk/... and so on uses that region's eBay site (and reports dex-<region>-listings-notfound); anywhere else it
 * is the US one, the region the page's own search uses. The page is prerendered and has no URL of its own, so the
 * region is read after mount. Until then the unit is laid out (it reserves its height) but INVISIBLE, and it appears in the
 * same render that learns the region: nothing visible moves (CLS 0), and its height does not depend on the region
 * (regionKnown={false}: no region sentence in the disclosure, two lines reserved for the CTA's note). It fetches only once it
 * is near the viewport, by which time the region is known.
 */
export function NotFoundEbay() {
  const { known, region } = usePathRegion();
  return (
    <div style={{ visibility: known ? "visible" : "hidden" }} className="mx-auto mt-12 max-w-3xl text-left">
      <EbayStrip region={region ?? X_DEFAULT_REGION} context="sealed" variant="slim" placement="listings-notfound" regionKnown={false} search={{ kind: "sealed", query: "" }} />
    </div>
  );
}
