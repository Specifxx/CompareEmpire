"use client";

import { useEffect, useState } from "react";
import { isRegion, X_DEFAULT_REGION, type Region } from "@/lib/regions";
import { EbayStrip } from "./EbayStrip";

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
  const [region, setRegion] = useState<Region | null>(null);
  useEffect(() => {
    const seg = window.location.pathname.split("/")[1]?.toLowerCase();
    setRegion(isRegion(seg) ? seg : X_DEFAULT_REGION);
  }, []);
  return (
    <div style={{ visibility: region ? "visible" : "hidden" }} className="mx-auto mt-10 max-w-3xl text-left">
      <EbayStrip region={region ?? X_DEFAULT_REGION} context="sealed" variant="slim" placement="listings-notfound" regionKnown={false} search={{ kind: "sealed", query: "" }} />
    </div>
  );
}
