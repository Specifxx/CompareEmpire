"use client";

import { usePathname } from "next/navigation";
import { AFFILIATE_NOTE_SHORT } from "@/lib/affiliate";
import { isRegion } from "@/lib/regions";
import { AdPill, EbaySearchLink } from "./Ebay";

/**
 * The footer's "Shop Pokémon sealed on eBay" link, labelled "Ad". The footer is
 * in the root layout and has no region of its own, so the region is read from
 * the URL; outside a region (the legal and trust pages, the landing page) there
 * is none and the link is not rendered, so those stay ad-free.
 *
 * Where the banner above the footer is showing it already says the same thing,
 * and the two would stand next to each other, so globals.css hides this link
 * then; it shows on the pages that dropped that banner (<NoPreFooter/>), and only
 * on phones: on a desktop screen a short page's own unit would sit beside it, so
 * from md up the footer carries no eBay link of its own.
 */
export function FooterEbay() {
  const seg = (usePathname() || "/").split("/")[1];
  if (!isRegion(seg)) return null;
  return (
    <li data-ad="footer" data-ebay-footer-link="" className="flex flex-wrap items-center gap-2 md:hidden">
      <AdPill />
      <EbaySearchLink region={seg} query="" placement="footer" className="text-muted hover:text-ink">
        Shop Pokémon sealed on eBay <span aria-hidden="true">↗</span>
      </EbaySearchLink>
      <span className="basis-full text-xs text-muted">{AFFILIATE_NOTE_SHORT}</span>
    </li>
  );
}
