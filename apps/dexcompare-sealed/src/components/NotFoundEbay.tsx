"use client";

import { useEffect, useState } from "react";
import { AFFILIATE_NOTE, ebayLabel } from "@/lib/affiliate";
import { isRegion, X_DEFAULT_REGION, type Region } from "@/lib/regions";
import { AdPill, EbaySearchLink } from "./Ebay";
import { EbayListingsStrip } from "./EbayListings";

/**
 * The 404's one labelled eBay search. A 404 under /au/..., /uk/... and so on goes
 * to that region's eBay site (and reports dex-<region>-not-found); anywhere else
 * it is the US one, the region the page's own search uses. The page is prerendered
 * and has no URL of its own, so the region is read after mount: the unit renders
 * for the US first and is the same size when it switches.
 */
export function NotFoundEbay({ listings = false }: { listings?: boolean }) {
  const [region, setRegion] = useState<Region>(X_DEFAULT_REGION);
  useEffect(() => {
    const seg = window.location.pathname.split("/")[1]?.toLowerCase();
    setRegion(isRegion(seg) ? seg : X_DEFAULT_REGION);
  }, []);
  const search = (
    <div data-ad="not-found" role="group" aria-label="Sponsored: eBay" className="ad-box mx-auto flex max-w-md flex-col items-center gap-2 px-5 py-4">
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        <AdPill />
        <EbaySearchLink region={region} query="" placement="not-found" className="font-semibold text-brand hover:underline">
          Search Pokémon sealed on eBay <span aria-hidden="true">↗</span>
        </EbaySearchLink>
      </div>
      <p className="text-xs text-muted">
        {AFFILIATE_NOTE} Goes to {ebayLabel(region)}.
      </p>
    </div>
  );
  // With eBay's API keys, the slim listings strip (the region's feed) in place of the one search link, and falling back to it.
  // It renders its fixed-size skeleton from the start (US), so the unit is the same size when the region is read after mount;
  // it fetches only once it is near the viewport, by which time the region is known.
  if (!listings) return <div className="mt-10">{search}</div>;
  return <EbayListingsStrip enabled region={region} context="generic" variant="slim" placement="listings-notfound" className="mx-auto mt-10 max-w-3xl text-left" fallback={search} />;
}
