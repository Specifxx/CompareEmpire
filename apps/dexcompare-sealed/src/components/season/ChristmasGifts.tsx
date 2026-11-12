import Link from "next/link";
import { CHRISTMAS_FESTIVE_LAYER, seasonMarkupLive } from "@/lib/season";
import { X_DEFAULT_REGION } from "@/lib/regions";

// Christmas (until Boxing Day): the gift-guide banner above the hero's headline (owner, 2026-11-12, tasteful accents only). One
// line of server HTML, not a heading, linking the existing gift guide. In the HTML only around the season and only while
// CHRISTMAS_FESTIVE_LAYER is on; shown only while <html> carries data-season="christmas" (globals.css .xmas-banner).
export function ChristmasGifts() {
  if (!CHRISTMAS_FESTIVE_LAYER || !seasonMarkupLive("christmas")) return null;
  return (
    <div className="mb-3 sm:mb-4">
      <Link href={`/${X_DEFAULT_REGION}/guides/pokemon-tcg-christmas-gift-guide`} prefetch={false} className="xmas-banner">
        <svg className="xmas-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M5 12v8h14v-8M12 8v12M12 8c-1.5-3.5-5-3.5-5-1.5S10.5 8 12 8c1.5 0 5 .5 5-1.5S13.5 4.5 12 8Z" />
        </svg>
        <span className="xmas-banner-text">
          <b>Christmas gift guide</b>
          <span className="xmas-banner-more hidden 2xl:inline"> · Pokémon gifts in stock by budget, cheapest first →</span>
        </span>
      </Link>
    </div>
  );
}
