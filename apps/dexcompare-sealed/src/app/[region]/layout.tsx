import { EbayBanner } from "@/components/Ebay";
import { PreFooterListings } from "@/components/EbayListings";
import { Header } from "@/components/Header";
import { ebayListingsEnabled } from "@/lib/ebay-listings";
import { regionOrNotFound } from "@/lib/regions";

// Empty on purpose: region pages render on their first visit and are then
// cached (ISR), never at build. A build must not depend on the database being
// reachable — when Rift Compare's database ran out of transfer, every deploy
// failed until it was replaced.
export function generateStaticParams() {
  return [];
}

// The 404 here is not enough on its own: a page's generateMetadata and body run
// alongside the layout, so every page under [region] resolves its region the
// same way before touching anything else (/terms, /foo and /AU used to 500).
export default function RegionLayout({ children, params }: { children: React.ReactNode; params: { region: string } }) {
  const r = regionOrNotFound(params.region);
  return (
    <>
      <Header region={r.region} />
      <main id="main" className="flex-1">
        {children}
        {/* Every region page ends with the eBay banner, directly above the site footer
            (inside <main>: it is page content, not a landmark of its own). A page too
            short to fit it beside its own units renders <NoPreFooter/>, and globals.css
            hides this wrapper. The legal pages and the 404 are not under [region], so
            they never get one. */}
        <div className="page mt-16" data-ebay-prefooter>
          {/* Real chase-card listings (a slim four-tile strip) when eBay's API keys are set; otherwise, and
              whenever there are none to show, the native banner. */}
          <PreFooterListings enabled={ebayListingsEnabled()} region={r.region} fallback={<EbayBanner region={r.region} variant="footer" placement="pre-footer" />} />
        </div>
      </main>
    </>
  );
}
