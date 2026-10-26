import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { Metadata } from "next";
import Link from "next/link";
import { ADSENSE_CLIENT } from "@/lib/adsense";
import { AMAZON_ASSOCIATE_STATEMENT, AMAZON_AU_REGIONS } from "@/lib/amazon";
import { REGIONS } from "@/lib/regions";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Affiliate disclosure",
  description: `How ${SITE_NAME} earns: eBay, TCGplayer and Amazon AU affiliate links, marked where they appear. ${AMAZON_ASSOCIATE_STATEMENT}`,
  alternates: { canonical: `${SITE_URL}/affiliate-disclosure` },
};

// Bump when the disclosure changes in substance, not for wording.
const LAST_UPDATED = "26 October 2026";

// The affiliate disclosure (the owner's Amazon Associates round, 2026-10-26), linked from every page's footer beside the Associates
// statement. Static: no data, no ads (like the Terms and Privacy pages).
export default function AffiliateDisclosure() {
  const amazonRegions = AMAZON_AU_REGIONS.map((r) => REGIONS[r].name).join(" and ");
  return (
    <div className="page max-w-3xl py-12">
      <Breadcrumbs items={[{ href: "/", label: "DexCompare" }, { label: "Affiliate disclosure" }]} />
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Affiliate disclosure</h1>
      <p className="mt-2 text-sm text-faint">Last updated {LAST_UPDATED}</p>
      <div className="prose-dex mt-6">
        <p>
          <b>{AMAZON_ASSOCIATE_STATEMENT}</b>
        </p>
        <p>
          {SITE_NAME} is free to use. It is paid for by affiliate links{ADSENSE_CLIENT ? " and by Google ads in some guides" : ""}: when you follow one of our affiliate links and
          buy something, the retailer may pay us a small commission. You pay the same price as you would going to the retailer directly.
        </p>

        <h2 id="which">Which links are affiliate links</h2>
        <ul>
          <li>
            <b>eBay</b>, through the eBay Partner Network: eBay searches and listings, marked with an &ldquo;Ad&rdquo; label.
          </li>
          <li>
            <b>TCGplayer</b>, through Impact: TCGplayer offers and searches, marked &ldquo;affiliate link&rdquo;.
          </li>
          <li>
            <b>Amazon AU</b>, through the Amazon Associates programme (amazon.com.au), on {amazonRegions} pages only: &ldquo;Check price on Amazon AU&rdquo;
            buttons and links, with the statement above beside them.
          </li>
        </ul>
        <p>
          Links to the independent stores we compare are <b>not</b> affiliate links: no store pays us, and no store pays to be listed or to rank.
        </p>

        <h2 id="ranking">Commissions never change a ranking</h2>
        <p>
          Every product&rsquo;s stores are ranked by price and stock only: in stock first, then cheapest first. An affiliate link never moves a store up or
          down. Amazon AU is never ranked with the stores at all, because we don&rsquo;t read Amazon&rsquo;s prices: its link says &ldquo;Check price on Amazon
          AU&rdquo;, and we show no Amazon price, rating, stock or delivery claim. Amazon&rsquo;s own page is final.
        </p>

        <h2 id="how">How the links work</h2>
        <p>
          Affiliate links go straight to the retailer&rsquo;s own site with our tracking code in the address: no link shorteners, no redirects that hide where
          a link goes. They open in a new tab and are marked <code>rel=&quot;sponsored&quot;</code> for search engines. The retailer may set its own cookies when
          you arrive; <Link href="/privacy">our privacy notice</Link> says what {SITE_NAME} itself records.
        </p>

        <h2 id="questions">Questions</h2>
        <p>
          <Link href="/about#money">How {SITE_NAME} makes money</Link> explains each programme in more detail, and you can <Link href="/contact">contact us</Link> about
          anything on this page.
        </p>
      </div>
    </div>
  );
}
