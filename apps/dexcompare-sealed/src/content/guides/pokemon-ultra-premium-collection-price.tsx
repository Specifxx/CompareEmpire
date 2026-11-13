// Guide: Pokémon Ultra-Premium Collection (UPC) prices (2026-11-13; the queries "pokemon upc", "ultra premium collection price",
// "30th celebration upc"). Every curated UPC open in the region today, cheapest first (data.ts: one capped read of the type), the two
// 30th Celebration boxes beside each other, what the publisher says is inside them (sourced in the text), and the checks before buying.
// Facts outside our data are the 30th Celebration's release date, list price and contents, each attributed. No pull rates, no forecast.
import Link from "next/link";
import { money, plural } from "@/lib/format";
import type { ProductCardData } from "@/lib/data";
import type { RegionInfo } from "@/lib/regions";
import { UPC_NAMES } from "@/lib/sealed-title";
import { toolHref } from "../tools";
import type { GuideData } from "./data";
import { GUIDE_BY_SLUG } from "./index";
import { Checklist, GuideBody, guideHref, Lede, LiveBlock, NextLinks, Note, Prose, productHref, StackTable, typeHref, whereText, whereToBuy, type BodyProps, type GuideOutline, type GuideSection } from "./kit";

const GUIDE = GUIDE_BY_SLUG.get("pokemon-ultra-premium-collection-price")!;
const LINK = "font-semibold text-brand hover:underline";
const DAY = "30th Celebration Ultra-Premium Collection (Day)";
const NIGHT = "30th Celebration Ultra-Premium Collection (Night)";

export function outline(r: RegionInfo, data: GuideData): GuideOutline {
  const m = (c: number | null | undefined) => money(c ?? null, r.market);
  const rows = (data.cards ?? []).filter((p) => p.lowestPriceCents && UPC_NAMES.includes(p.name));
  const day = rows.find((p) => p.name === DAY) ?? null;
  const night = rows.find((p) => p.name === NIGHT) ?? null;
  const cheapest = rows[0] ?? null;
  const us = r.market === "US";
  const row = (p: ProductCardData) => ({
    key: p.slug,
    type: "upc",
    th: (
      <Link href={productHref(r, p)} prefetch={false} className="font-semibold text-ink hover:text-brand hover:underline">
        {p.name}
      </Link>
    ),
    cells: [
      <span key="p" className="font-semibold">
        {m(p.lowestPriceCents)}
      </span>,
      <span key="w" className="text-muted">
        {whereText(p)}
      </span>,
    ],
  });

  const sections: GuideSection[] = [
    {
      id: "prices-today",
      title: `Ultra-Premium Collection prices in ${r.inName} today`,
      live: true,
      body: (
        <>
          <Prose>
            <p>
              An Ultra-Premium Collection, usually shortened to UPC, is the Pokémon TCG&rsquo;s top-end collector box: dozens of packs, foil promo cards and premium extras such as a
              playmat, sleeves and a metal coin. Below is every UPC in stock in {r.inName} right now, cheapest first. Each price is one store&rsquo;s own listed price in {r.currency},
              before shipping; the last column says how many stores have it in stock.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            {rows.length ? (
              <StackTable caption={`Every Pokémon Ultra-Premium Collection in stock in ${r.inName} today, cheapest first`} head={["Ultra-Premium Collection", "Price", "In stock at"]} rows={rows.map(row)} />
            ) : (
              <p className="text-sm leading-6 text-muted">No Ultra-Premium Collection is in stock in {r.inName} right now. A store can list one at any time; the product pages show every store that has listed it, sold out included.</p>
            )}
          </LiveBlock>
          <Prose>
            {cheapest && (
              <p>
                The cheapest UPC in {r.inName} today is the <Link href={productHref(r, cheapest)}>{cheapest.name}</Link> at <strong>{m(cheapest.lowestPriceCents)}</strong>. In all,{" "}
                {plural(rows.length, "Ultra-Premium Collection")} {rows.length === 1 ? "is" : "are"} in stock here today. Every UPC, sold out included, is on the{" "}
                <Link href={typeHref(r, "upc")}>Ultra-Premium Collections page</Link>.
              </p>
            )}
          </Prose>
        </>
      ),
    },
    {
      id: "30th-celebration",
      title: "30th Celebration UPC: Day (Espeon) vs Night (Umbreon)",
      live: true,
      body: (
        <>
          <Prose>
            <p>
              The newest UPCs are the two 30th Celebration boxes, <strong>Day</strong> (Espeon) and <strong>Night</strong> (Umbreon), which ICv2 reported would reach retail on
              6 November 2026. They are sold as a pair at the same list price, and some retailers sell them as &ldquo;styles may vary&rdquo;, so check the listing says which one you get.
            </p>
          </Prose>
          <LiveBlock r={r} checked={data.checked}>
            <StackTable
              caption={`The 30th Celebration Day and Night Ultra-Premium Collections in ${r.inName} today`}
              head={["Box", "Cheapest today", "In stock at"]}
              rows={[
                { label: "Day (Espeon)", p: day },
                { label: "Night (Umbreon)", p: night },
              ].map(({ label, p }) => ({
                key: label,
                type: "upc",
                th: p ? (
                  <Link href={productHref(r, p)} prefetch={false} className="font-semibold text-ink hover:text-brand hover:underline">
                    30th Celebration UPC · {label}
                  </Link>
                ) : (
                  <span className="font-semibold text-ink">30th Celebration UPC · {label}</span>
                ),
                cells: [
                  <span key="p" className="font-semibold">
                    {p ? m(p.lowestPriceCents) : "—"}
                  </span>,
                  <span key="w" className="text-muted">
                    {p ? whereText(p) : "None in stock right now"}
                  </span>,
                ],
              }))}
            />
          </LiveBlock>
          <Prose>
            {day && night ? (
              <p>
                Right now the Day box is from {m(day.lowestPriceCents)} and the Night box from {m(night.lowestPriceCents)} in {r.inName}.
              </p>
            ) : (
              <p>One of the two is missing in {r.inName} right now; it appears here on the next check if a store lists it.</p>
            )}
            {us && (
              <p>
                The publisher&rsquo;s US list price is $179.99 a box, according to ICv2&rsquo;s report. A store&rsquo;s own price can sit well above that, and a price at or near $179.99 is
                worth a second look at the listing: check it is the 30th Celebration box, English-language and sealed.
              </p>
            )}
          </Prose>
        </>
      ),
    },
    {
      id: "whats-inside",
      title: "What is inside the 30th Celebration UPC",
      body: (
        <>
          <Prose>
            <p>
              As ICv2 and Cardlines describe the two boxes: 29 regular 30th Celebration booster packs plus one separate &ldquo;Classic Collection&rdquo; booster, two foil promo cards
              (a Pikachu ex in the box&rsquo;s day or night art, and an Espeon ex or an Umbreon ex), a playmat, 65 card sleeves, a deck box, a metal coin, six damage-counter dice and a
              Pokémon TCG Live code card. Day and Night hold the same things in their own artwork.
            </p>
            <p>
              Older UPCs follow the same idea with their own set: Scarlet &amp; Violet—151, Mega Charizard X ex, Terapagos ex, Greninja ex, Team Rocket&rsquo;s Moltres ex, Charizard,
              Arceus VSTAR, Zacian &amp; Zamazenta, Celebrations and Hidden Fates. The table above lists every one in stock; each product page lists every store.
            </p>
          </Prose>
          <Note>Contents and the release date are the publisher&rsquo;s, as reported by ICv2 (July 2026) and Cardlines (5 November 2026). Prices are read from stores, never from those pages.</Note>
        </>
      ),
    },
    {
      id: "checks",
      title: "Before you buy a UPC",
      body: (
        <>
          <Prose>
            <p>A UPC costs enough that the checks are worth a minute:</p>
          </Prose>
          <Checklist
            items={[
              <>Check the exact product: Day or Night, English, and not a single card, an empty box or a repack with a similar name.</>,
              <>Add the store&rsquo;s delivery cost to the price, and look for a returns policy and real contact details if you haven&rsquo;t bought there before.</>,
              <>
                When it arrives, check the shrink-wrap before you open it: <Link href={guideHref(r, "how-to-avoid-resealed-pokemon-products")}>how to avoid resealed products</Link>.
              </>,
              <>If one price is far under every other store&rsquo;s, check the listing twice: it can be a mistake, or not the product its title suggests.</>,
            ]}
          />
          <NextLinks
            links={[
              { href: toolHref(r.region, "value-checker"), label: "Value checker", icon: "search" },
              { href: toolHref(r.region, "trade-calculator"), label: "Trade calculator", icon: "arrow-right" },
              { href: `/${r.region}/preorders`, label: "Pre-orders", icon: "calendar" },
            ]}
          />
        </>
      ),
    },
    whereToBuy(r, {
      tcg: { query: "Pokemon Ultra Premium Collection", label: "Pokémon Ultra-Premium Collections" },
      links: [{ href: typeHref(r, "upc"), label: "Every Ultra-Premium Collection" }],
    }),
  ];

  return {
    intro: (
      <Lede>
        {cheapest ? (
          <>
            The cheapest Pokémon Ultra-Premium Collection in stock in {r.inName} today is the <strong>{cheapest.name}</strong> at <strong>{m(cheapest.lowestPriceCents)}</strong>.{" "}
          </>
        ) : (
          <>No Pokémon Ultra-Premium Collection is in stock in {r.inName} right now. </>
        )}
        Below, every UPC ranked by price, the 30th Celebration Day and Night boxes side by side, and what to check before you buy.{" "}
        <Link href={typeHref(r, "upc")} prefetch={false} className={LINK}>
          All Ultra-Premium Collections →
        </Link>
      </Lede>
    ),
    sections,
  };
}

export function Body({ r, data }: BodyProps) {
  return <GuideBody data={data} guide={GUIDE} r={r} outline={outline(r, data)} />;
}
