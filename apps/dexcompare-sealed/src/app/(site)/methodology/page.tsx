import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CONTACT_EMAIL, OPERATOR, SITE_NAME, SITE_URL } from "@/lib/site";

// Static: no data read. The linkable "how the numbers are made" page outreach points at (Audience programme pillar 1,
// 2026-11-22), ported from MTG Compare's /methodology. Kept in step with /about, /how-we-pick-stores and /affiliate-disclosure.
export const metadata: Metadata = {
  title: "Methodology",
  description: `What ${SITE_NAME} tracks and what it does not: where Pokémon sealed prices come from, how often they are read, how a listing is matched, how the table is ordered, how the site earns and how mistakes are corrected.`,
  alternates: { canonical: `${SITE_URL}/methodology` },
};

const LAST_UPDATED = "22 November 2026";

/** Dated corrections to published figures or pages, newest first. A correction is added here, never made silently. */
const CORRECTIONS: { date: string; text: string }[] = [];

const a = "underline underline-offset-2 hover:text-ink";

export default function Methodology() {
  return (
    <div className="page max-w-3xl py-12">
      <Breadcrumbs items={[{ href: "/", label: SITE_NAME }, { label: "Methodology" }]} />
      <div className="prose-dex mt-6">
        <h1>Methodology</h1>
        <p className="text-sm text-faint">Last updated {LAST_UPDATED}</p>
        <p>
          {SITE_NAME} compares the price of sealed Pokémon TCG product (booster boxes, Elite Trainer Boxes, bundles, tins, collections and packs) across independent stores in
          each region. This page says what we track, what we do not, how a listing is matched to a product, how the table is put in order and how we fix mistakes.
        </p>

        <h2 id="track">What we track</h2>
        <ul>
          <li>The price and stock of sealed product at the stores listed on <Link href="/how-we-pick-stores" prefetch={false} className={a}>How we pick stores</Link>, read from each store&rsquo;s own public catalogue twice a day. Each product page says when its prices were checked.</li>
          <li>Once a day, the cheapest in-stock price of each product in each region and how many stores have it, kept as the price history on product pages (from 15 October 2026). A chart appears only once a product has enough days of data; nothing is filled in or estimated.</li>
          <li>Each store&rsquo;s measured shipping for one item, where we have measured it. Where we have not, the row says shipping is at checkout; shipping is never added silently to a price.</li>
          <li>eBay and TCGplayer listings and Amazon links, labelled as marketplaces. They are never counted as a store.</li>
        </ul>

        <h2 id="match">How a listing is matched</h2>
        <p>
          A store listing is put on a product page only when its title reads as exactly that product: the same set, the same product type and the same language. Singles, graded
          cards, accessories, store-made bundles, damaged or opened product and other languages are left out. When a title could be two products, it is left out rather than
          guessed: a missing price is better than a price on the wrong product. An in-stock price far below what the other stores charge for the same product is dropped.
        </p>

        <h2 id="not">What we do not track</h2>
        <ul>
          <li>Prices in another currency than the region&rsquo;s. A region compares only stores that charge in its currency; prices are never converted for display or ranking.</li>
          <li>Any price, release date or pack count we are not sure of.</li>
          <li>The individual sellers on marketplaces. Check a seller&rsquo;s feedback before you buy.</li>
        </ul>

        <h2 id="ranking">How the table is ordered</h2>
        <p>
          By item price, cheapest first. Commission never decides the order. Marketplace rows are pinned at the top, labelled, and are never called the cheapest on their own
          account.
        </p>

        <h2 id="earn">How the site earns</h2>
        <p>
          Some links are affiliate links (eBay Partner Network, TCGplayer through Impact, Amazon Associates), marked &ldquo;Ad&rdquo; or &ldquo;Paid link&rdquo;. If you buy through one we may
          earn a commission at no extra cost to you. Stores do not pay to be listed or to rank. Full detail: <Link href="/affiliate-disclosure" prefetch={false} className={a}>Affiliate disclosure</Link>.
        </p>

        <h2 id="use">Using our prices</h2>
        <p>
          Writers, newsletters and community sites can show a live price with our free <Link href="/widgets" prefetch={false} className={a}>price widgets</Link>. Please credit {SITE_NAME} with a link when you quote a price, and give the date: prices change every day.
        </p>

        <h2 id="corrections">Corrections</h2>
        {CORRECTIONS.length ? (
          <ul>{CORRECTIONS.map((c) => <li key={c.date + c.text}>{c.date}: {c.text}</li>)}</ul>
        ) : (
          <p>No corrections recorded since this log began on {LAST_UPDATED}. When a figure we published is wrong, we fix it and list the fix here with its date.</p>
        )}

        <h2 id="independent">Independence</h2>
        <p>
          {SITE_NAME} is an independent site, not affiliated with The Pokémon Company, Nintendo, Creatures or Game Freak, or with any store it lists.
          {OPERATOR !== SITE_NAME && ` It is operated by ${OPERATOR}.`} Who runs it: <Link href="/about" prefetch={false} className={a}>About</Link>. A wrong price or a store we should check:{" "}
          <Link href="/contact" prefetch={false} className={a}>contact us</Link>{CONTACT_EMAIL ? ` or write to ${CONTACT_EMAIL}` : ""}.
        </p>
      </div>
    </div>
  );
}
