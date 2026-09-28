import type { Metadata } from "next";
import Link from "next/link";
import { REGION_LIST } from "@/lib/regions";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { STORES, storesInMarket } from "@/lib/stores";

export const metadata: Metadata = {
  title: "How DexCompare works",
  description: "How DexCompare finds Pokémon sealed prices and stock, what it does and doesn't store, how it makes money, and how stores get listed.",
  alternates: { canonical: `${SITE_URL}/about` },
};

export default function About() {
  return (
    <div className="page max-w-3xl py-12">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">How DexCompare works</h1>
      <div className="prose-dex mt-6">
        <p>
          DexCompare compares Pokémon TCG <b>sealed product</b> — booster boxes, Elite Trainer Boxes, booster bundles, collections,
          tins, blisters and packs — across {STORES.length} independent stores in {REGION_LIST.length} regions. It does one job: show you
          who has something in stock and who is cheapest.
        </p>

        <h2>Where the prices come from</h2>
        <p>
          About twice a day we read each store&rsquo;s public product listings (the same catalogue feed their own website uses), in the
          store&rsquo;s own currency. Every price you see is that store&rsquo;s listed price, excluding shipping. We never convert currencies:
          a region only compares stores that charge in its currency.
        </p>
        <p>
          In the United States we also read TCGplayer, a marketplace of many sellers, and show the cheapest English listing among its
          lowest-priced offers for each product when we last read it, excluding shipping — one seller&rsquo;s price, which may have changed
          by the time you click. It is compared with the US stores on the same terms: price, then stock. It is never counted as one of the
          stores.
        </p>
        <ul>
          <li>
            <b>In stock</b> — the store listed it as available when we last read it.
          </li>
          <li>
            <b>Pre-order</b> — available to order for a set that hasn&rsquo;t released yet.
          </li>
          <li>
            <b>Sold out</b> — listed, but not available.
          </li>
          <li>
            <b>Not checked recently</b> — we couldn&rsquo;t read that store for over three days, so we don&rsquo;t know.
          </li>
        </ul>
        <p>
          The headline &ldquo;from&rdquo; price is always the cheapest listing you can actually order. We match listings to products by their
          titles, and we&rsquo;d rather leave a listing out than put it on the wrong product: singles, graded cards, accessories, other
          languages and store-made bundles are excluded.
        </p>

        <h2>What we don&rsquo;t keep</h2>
        <p>
          DexCompare keeps no price history and no stock history — only what each store lists right now — and no data about you: no
          accounts, no emails, no cookies. We count page views and clicks on buy links, without knowing who made them. See{" "}
          <Link href="/privacy">privacy</Link>.
        </p>

        <h2 id="money">How DexCompare makes money</h2>
        <p>
          Through affiliate links, and only two kinds. If you buy through one we may earn a small commission, at no cost to you — the
          price is the same as going direct.
        </p>
        <ul>
          <li>
            <b>eBay</b> (eBay Partner Network): the &ldquo;Search eBay&rdquo; links for Buy It Now listings on your region&rsquo;s eBay site.
          </li>
          <li>
            <b>TCGplayer</b> (through Impact): every link to tcgplayer.com. TCGplayer is a US marketplace. In the United States we
            compare it alongside the stores, and it is ranked by price and stock like any store. Elsewhere it appears only as a separate,
            labelled US marketplace in US$, never in your region&rsquo;s comparison or its &ldquo;from&rdquo; price.
          </li>
        </ul>
        <p>
          Links to stores are plain links: stores pay us nothing. No one pays to be listed or to rank higher, and commissions never change the
          order — it is price and stock, nothing else. Affiliate links are marked as such next to where they appear.
        </p>

        <h2 id="stores">For stores</h2>
        <p>
          If you sell English Pokémon sealed product online on Shopify or WooCommerce, we can list you for free. Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with your store&rsquo;s address. If you&rsquo;d rather not be listed, email us
          and we&rsquo;ll remove you within a day. We read a few pages of your catalogue twice a day and respect robots.txt.
        </p>
        <p>
          Stores currently compared:{" "}
          {REGION_LIST.map((r, i) => (
            <span key={r.region}>
              {i > 0 && ", "}
              <Link href={`/${r.region}/stores`}>
                {storesInMarket(r.market).length} in {r.name}
              </Link>
            </span>
          ))}
          .
        </p>

        <h2>Not affiliated</h2>
        <p>
          DexCompare is an independent site and is not affiliated with, endorsed or sponsored by Nintendo, Creatures, GAME FREAK or The
          Pokémon Company. Pokémon and its trademarks are theirs.
        </p>
      </div>
    </div>
  );
}
