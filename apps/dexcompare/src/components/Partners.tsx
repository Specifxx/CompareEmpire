"use client";

import { OutboundLink } from "./OutboundLink";
import { AffiliateDisclosure } from "./AffiliateDisclosure";
import { affiliateUrl, ebaySearchUrl } from "@/lib/affiliate";
import { useCountry } from "./CountryProvider";

// Trust strip: the partner programs DexCompare is APPROVED for — shown as a
// credibility signal. Framing stays honest ("approved affiliate partners"):
// these are real, approved programs (eBay Partner Network; TCGplayer via
// Impact), not a corporate endorsement, and the copy never claims more.
// Wordmarks are styled text — no third-party logo assets are copied.
//
// Client component reading the market from CountryProvider (not a server-passed
// prop) so the eBay search link stays correct for the visitor's actual market on
// a page that's ISR-cached and cookie-free — the same pattern as DealsRail/
// HeroStats. This component went missing from the homepage entirely at some
// point (caught by scripts/smoke test's "Official partners" check); re-added
// here rather than restored verbatim, since the old server-prop signature would
// have baked in the AU baseline for every visitor regardless of chosen market.
export function Partners() {
  const { country } = useCountry();
  const ebayHref = ebaySearchUrl("pokemon cards", country);
  const tcgHref = affiliateUrl("https://www.tcgplayer.com/search/pokemon/product");
  return (
    <section className="card-surface px-5 py-4" aria-label="Official partners">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-300">Official partners</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Approved affiliate partners — every price links straight to the source.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
          <OutboundLink
            href={ebayHref}
            retailer="ebay_search"
            country={country}
            className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-2.5 transition-colors hover:border-brand-500/50"
          >
            <span className="text-2xl font-extrabold lowercase tracking-tight" aria-label="eBay">
              <span style={{ color: "#e53238" }}>e</span>
              <span style={{ color: "#0064d2" }}>b</span>
              <span style={{ color: "#f5af02" }}>a</span>
              <span style={{ color: "#86b817" }}>y</span>
            </span>
            <span className="text-left">
              <span className="block text-xs font-semibold text-white">eBay Partner Network</span>
              <span className="block text-[11px] text-slate-500">Live secondary-market prices</span>
            </span>
          </OutboundLink>
          <OutboundLink
            href={tcgHref}
            retailer="tcgplayer"
            country={country}
            className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-2.5 transition-colors hover:border-brand-500/50"
          >
            <span className="text-xl font-extrabold tracking-tight text-white" aria-label="TCGplayer">
              TCG<span className="text-sky-400">player</span>
            </span>
            <span className="text-left">
              <span className="block text-xs font-semibold text-white">Approved affiliate partner</span>
              <span className="block text-[11px] text-slate-500">Live US market prices</span>
            </span>
          </OutboundLink>
        </div>
      </div>
      {/* Both wordmarks above are affiliate-tagged links, so this strip needs its
          own disclosure — presented as a trust badge it otherwise reads as a
          neutral endorsement rather than advertising (EPN §I.G). */}
      <AffiliateDisclosure className="mt-3" />
    </section>
  );
}
