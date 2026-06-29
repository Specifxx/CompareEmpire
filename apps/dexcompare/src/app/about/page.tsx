import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "About DexCompare — How our Pokémon price comparison works",
  description:
    "How DexCompare sources Pokémon TCG card prices, our data methodology, which stores and markets we cover, and why you can trust the comparison.",
  alternates: { canonical: "/about" },
};

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${SITE_URL}/about`,
  url: `${SITE_URL}/about`,
  name: `About ${SITE_NAME}`,
  description:
    "How DexCompare sources Pokémon TCG card prices, the stores and markets we cover, and our delivered-cost methodology.",
  publisher: { "@type": "Organization", "@id": `${SITE_URL}/#org` },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "About", item: `${SITE_URL}/about` },
    ],
  },
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />

      <h1 className="text-3xl font-extrabold leading-tight text-white">About DexCompare</h1>
      <p className="mt-2 text-sm text-slate-500">
        The Pokémon TCG card database and live price comparison
      </p>

      <div className="mt-6 space-y-8 border-t border-ink-800 pt-6 text-sm leading-relaxed text-slate-300">

        {/* Mission */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">What DexCompare is</h2>
          <p>
            DexCompare is a Pokémon TCG price-comparison database. We track the live prices of
            singles, sealed products, and restocks across dozens of retailers in Australia, New
            Zealand, the United States, and the United Kingdom — and rank them by total delivered
            cost so you instantly know the cheapest place to buy.
          </p>
          <p>
            We built DexCompare because Pokémon card prices vary enormously between stores, and
            the &ldquo;cheapest listed price&rdquo; is often not the cheapest landed price once
            postage is added. A store charging $2 more per card but offering free shipping above
            a $30 threshold will frequently beat a cheaper store that tacks on a $5 flat fee.
            The comparison does that maths for you.
          </p>
        </section>

        {/* Data sourcing */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">How we source prices</h2>
          <p>
            Our crawler visits each retailer&apos;s public product listings on a daily schedule
            and extracts the listed price, stock status, and (where available) shipping cost. We
            do not scrape at a rate that burdens retailers&apos; servers — one polite pass per
            store per day, respecting{" "}
            <code className="rounded bg-ink-800 px-1 font-mono text-xs text-slate-300">robots.txt</code>{" "}
            directives and crawl-delay headers.
          </p>
          <p>
            Card identity is matched using the official Pokémon TCG set code and collector number
            (e.g. <span className="font-mono text-xs text-slate-200">OBF 004</span>) rather than
            name alone, because many cards share a name across sets. This means a search for
            &ldquo;Charizard&rdquo; always surfaces the correct print rather than mixing up Base
            Set holo with a modern reprint.
          </p>
        </section>

        {/* Delivered-cost methodology */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">Delivered-cost methodology</h2>
          <p>
            Every store comparison on DexCompare ranks results by <strong className="text-white">
            total delivered cost</strong> — the card price plus estimated postage to your selected
            market. Free-shipping thresholds are factored in: if a store offers free shipping
            above $50 and you have $50+ in your cart, the shipping cost is set to $0 for that
            comparison.
          </p>
          <p>
            Postage rates are sourced from each store&apos;s published shipping page or their
            checkout flow and are stored alongside the price data. When a store changes its
            shipping rates we update them at the next crawl. Because postage varies by order
            weight and value, the figure shown is an estimate for a single card order —
            your actual checkout total may differ, especially for heavy sealed products.
          </p>
        </section>

        {/* Markets */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">Markets we cover</h2>
          <p>
            We currently operate four regional markets, each showing prices in local currency
            from stores that ship to buyers in that region:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong className="text-white">🇦🇺 Australia</strong> — AUD, the most extensively covered market</li>
            <li><strong className="text-white">🇳🇿 New Zealand</strong> — NZD</li>
            <li><strong className="text-white">🇺🇸 United States</strong> — USD</li>
            <li><strong className="text-white">🇬🇧 United Kingdom</strong> — GBP</li>
          </ul>
          <p>
            Switch markets at any time using the flag selector in the top navigation. Prices,
            store rankings, and shipping estimates all update instantly to reflect your chosen
            region. The full store list for each market is on the{" "}
            <Link href="/stores" className="text-brand-400 hover:underline">Stores we track</Link>{" "}
            page.
          </p>
        </section>

        {/* Price freshness */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">Price freshness</h2>
          <p>
            Prices refresh daily. The timestamp shown on a card&apos;s price row reflects when
            that store&apos;s listing was last crawled. Because prices and stock can change
            between our crawl and when you visit, we always recommend confirming the final price
            at the retailer&apos;s checkout before completing a purchase.
          </p>
          <p>
            Sealed products and restock trackers follow the same daily cadence. If you want to be
            notified when a card drops below a target price, use the{" "}
            <Link href="/wishlist" className="text-brand-400 hover:underline">Wishlist price alerts</Link>{" "}
            — we&apos;ll email you when the comparison detects a match.
          </p>
        </section>

        {/* Card database */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">Card database</h2>
          <p>
            Our card catalogue is built on data from the{" "}
            <a
              href="https://pokemontcg.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 hover:underline"
            >
              Pokémon TCG API
            </a>
            , which provides official set and card metadata including set codes, collector numbers,
            rarity, artist, and card art. We augment this with our own price and stock layer.
            The database currently covers every English-language set from Base Set through to the
            most recently released expansions.
          </p>
        </section>

        {/* Who we are */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">Who we are</h2>
          <p>
            DexCompare is an independent project run by a small team of Pokémon TCG collectors
            and developers. We built the tool for ourselves — to stop overpaying for cards — and
            opened it to the community. We have no affiliation with Nintendo, The Pokémon Company,
            or Game Freak. Prices shown are sourced from public retailer listings and do not
            represent official pricing.
          </p>
          <p>
            We also run{" "}
            <a
              href="https://riftcompare.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 hover:underline"
            >
              RiftCompare
            </a>
            , a sister site covering Riftbound (the League of Legends TCG) with the same
            methodology.
          </p>
        </section>

        {/* Transparency / affiliate disclosure */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">Affiliate links &amp; transparency</h2>
          <p>
            Some &ldquo;View deal&rdquo; links on DexCompare are affiliate links — if you make a
            purchase after clicking one, we may earn a small commission at no extra cost to you.
            Affiliate relationships never influence how stores are ranked in the comparison: ranking
            is always by total delivered cost, lowest first, regardless of whether a store has an
            affiliate arrangement with us.
          </p>
          <p>
            Advertising is displayed to help keep the service free. Ads are clearly visually
            distinct from price-comparison content.
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">Get in touch</h2>
          <p>
            Found a wrong price, a missing store, or a card that isn&apos;t matched correctly?
            We&apos;d love to hear about it. Send us an email at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-brand-400 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            or use the{" "}
            <Link href="/contact" className="text-brand-400 hover:underline">contact page</Link>.
          </p>
        </section>

      </div>

      {/* Cross-links */}
      <div className="mt-8 flex flex-wrap gap-3 border-t border-ink-800 pt-6 text-sm">
        <Link href="/stores" className="text-brand-400 hover:underline">Stores we track →</Link>
        <Link href="/guides" className="text-brand-400 hover:underline">Buying guides →</Link>
        <Link href="/browse" className="text-brand-400 hover:underline">Browse the database →</Link>
        <Link href="/contact" className="text-brand-400 hover:underline">Contact us →</Link>
      </div>
    </article>
  );
}
