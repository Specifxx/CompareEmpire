import { AmazonLink } from "@/components/AmazonLink";
import { amazonCarries, amazonFor, amazonHref, amazonLabel } from "@/lib/amazon";
import { amazonLiveFor } from "@/lib/amazon-live";
import type { Region } from "@/lib/regions";

/**
 * A small unpriced "Also on Amazon" link under the product page's price table (owner, 2026-11-16, after the Amazon clicks fell from about
 * 100 a day to nothing when the priced-only row rule of 2026-11-12 took the search rows away). Not a pinned paid row, never a price, the
 * best price or a deal, never in the quick view (the A/B test), only where Amazon sells the item (a known ASIN, else a type Amazon
 * carries), and not when the table already shows Amazon's own priced row. The region's shared tag, ascsubtag dex-<region>-amazon-below-table.
 */
export function AmazonBelowTable({ region, slug, name, typeKey }: { region: Region; slug: string; name: string; typeKey?: string | null }) {
  if (!amazonFor(region)) return null;
  const live = amazonLiveFor(slug, region);
  if (live?.cents) return null; // the priced Amazon row is in the table already
  if (!amazonCarries(typeKey, !!live)) return null;
  const href = live ? live.url.replace(/ascsubtag=[^&]*/, "ascsubtag=" + encodeURIComponent(`dex-${region}-amazon-below-table`)) : amazonHref(region, slug, name, "amazon-below-table");
  if (!href) return null;
  const label = amazonLabel(region);
  return (
    <p className="mt-3 text-sm text-muted">
      Also on {label}:{" "}
      <AmazonLink region={region} href={href} product={slug} placement="amazon-below-table" className="font-semibold text-ink underline decoration-line underline-offset-2 hover:decoration-ink">
        see {name} on {label} ↗
      </AmazonLink>{" "}
      <span className="text-xs">Paid link, price not shown.</span>
    </p>
  );
}
