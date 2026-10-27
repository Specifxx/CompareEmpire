import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CardImage } from "@/components/CardImage";
import { DomainBadge, RarityBadge, VariantBadge, OvernumberedBadge, PromoBadge, SignatureBadge } from "@/components/Badge";
import { isOvernumbered, isSignature } from "@/lib/constants";
import { POKEMON_SETS } from "@/lib/pokemon-sets";
import { CardMarketplace } from "@/components/CardMarketplace";
import { MARKETPLACE_ENABLED } from "@/lib/flags";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { CollectionButton } from "@/components/CollectionButton";
import { CardViewBeacon } from "@/components/CardViewBeacon";
import { CardReviews, type ReviewView } from "@/components/CardReviews";
import { NetProceeds } from "@/components/NetProceeds";
import { CardTile, type CardTileData } from "@/components/CardTile";
import { EmbedSnippet } from "@/components/EmbedSnippet";
import { WatchPriceButton } from "@/components/WatchPriceButton";
import { cardTileSelect } from "@/lib/cards";
import { formatMoney, timeAgo } from "@/lib/format";
import { effectiveShippingCents, shippingPolicyUrl } from "@/lib/retailers";
import { affiliateUrl, ebaySearchUrl } from "@/lib/affiliate";
import { aggregateOffer } from "@/lib/structured-data";
import { COUNTRIES, DEFAULT_COUNTRY, pickPrice, marketGuideCents } from "@/lib/country";
import { SITE_URL } from "@/lib/site";
import { buildAboutCard, buildCardFaqs, cardFinish, type CardFinish } from "@/lib/card-copy";
import { EnglishOnlyToggle } from "@/components/EnglishOnlyToggle";
import { OutboundLink } from "@/components/OutboundLink";
import { AdSlot } from "@/components/AdSlot";
import { TcgplayerAd } from "@/components/TcgplayerAd";
import { EbayAd } from "@/components/EbayAd";
import { AffiliateDisclosure } from "@/components/AffiliateDisclosure";

// Genuine ISR. The server render is market-neutral (AU baseline) and cookie-free
// — prices localize client-side, and the session-gated marketplace is a client
// island (CardMarketplace). This is THE indexation fix: the page carried
// `revalidate` but a session cookie read (getCurrentUser) silently made all ~20k
// card pages uncacheable dynamic SSR, which throttled Googlebot's crawl and
// stalled indexation at "Discovered – not crawled".
export const revalidate = 86400;

// Prewarm only the most-searched priced cards (fixed head — NEVER scale this
// with catalog size; at ~20k cards a full prewarm is 20k renders per deploy).
// The long tail is generated on first request and then ISR-cached
// (dynamicParams defaults to true). Declaring this export at all — even
// returning [] on failure — makes the route's static/ISR eligibility
// EXPLICIT: the build fails loudly if any dynamic API (cookies/headers) ever
// sneaks back into the render, and the build sandbox has no DATABASE_URL, so
// degrade to on-demand-only rather than failing.
export async function generateStaticParams() {
  try {
    const cards = await prisma.card.findMany({
      where: { hasLivePrice: true },
      orderBy: [{ searchCount: "desc" }, { viewCount: "desc" }],
      take: 200,
      select: { slug: true, id: true },
    });
    return cards.map((c) => ({ id: c.slug ?? c.id }));
  } catch {
    return [];
  }
}

// Accept either the slug ("vayne-hunter-sfd-223-221") or the legacy cuid.
const whereParam = (p: string) => ({ OR: [{ slug: p }, { id: p }] });

// Truncate at a word boundary (no mid-word cuts — Google elides with "…"
// itself) and drop any dangling punctuation the cut left behind.
function truncateAtWord(name: string, max: number): string {
  const trimmed = name.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const word = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return word.replace(/[\s:,&-]+$/, "");
}

// `setCode` is the internal pokemontcg.io API set ID ("base4", "sv3pt5", …),
// not a name a buyer recognizes — showing it in a SERP snippet reads as
// broken/spammy (this is why /card/base4-57-poliwhirl ranked #2.7 for its
// query yet had 0% CTR over 27 impressions per GSC). Use the real set name
// instead, truncating/dropping it before the collector number if the full
// parenthetical would blow the title's ~60-char / description's ~155-char
// SERP truncation budget.
function cardSubject(name: string, setName: string, collectorNumber: string, maxLen: number): string {
  const withNum = `${name} (${setName} ${collectorNumber})`;
  if (withNum.length <= maxLen) return withNum;
  const withoutNum = `${name} (${setName})`;
  if (withoutNum.length <= maxLen) return withoutNum;
  const setBudget = maxLen - name.length - 3; // "( )" wrapper
  if (setBudget >= 15) return `${name} (${truncateAtWord(setName, setBudget)})`;
  return name;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const card = await prisma.card.findFirst({
    where: whereParam(params.id),
    select: {
      slug: true, name: true, setName: true, setCode: true, collectorNumber: true,
      lowestPriceCents: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true,
      marketPriceSource: true, imageUrl: true, imageThumbUrl: true,
    },
  });
  if (!card) notFound(); // real 404 — metadata resolves before streaming

  // MARKET-NEUTRAL metadata: Googlebot crawls from US IPs, so cookie-derived
  // copy ("price in the United States") would be what gets indexed for every
  // market — fragmented snippets at 20k-page scale.
  const titleSubject = cardSubject(card.name, card.setName, card.collectorNumber, 26);
  const title = `${titleSubject} price — compare cheapest stores`;
  // Lead the snippet with a real price where one exists (currency-labelled, so
  // still market-neutral) — a concrete number lifts SERP CTR at 20k-page scale.
  const from =
    card.lowestPriceCents != null ? `from ${formatMoney(card.lowestPriceCents, "AUD")}` :
    card.lowestPriceCentsUs != null ? `from ${formatMoney(card.lowestPriceCentsUs, "USD")}` :
    card.lowestPriceCentsGb != null ? `from ${formatMoney(card.lowestPriceCentsGb, "GBP")}` :
    null;
  const descSubject = cardSubject(card.name, card.setName, card.collectorNumber, 36);
  const description = from
    ? `${descSubject} ${from} today. Compare live prices across stores in Australia, the US and the UK — updated daily.`
    // No store price to lead with (this card is guide-only or unpriced) — don't
    // claim "today's cheapest price" when there isn't one, and don't say "live"
    // for a pipeline that only runs once a day (see the cadence note above
    // generateStaticParams). "Track" + "checked daily" is honest either way.
    : `Track ${descSubject} across stores in Australia, the US and the UK — checked daily.`;
  const image = card.imageUrl ?? card.imageThumbUrl ?? undefined;

  return {
    title,
    description,
    alternates: {
      canonical: `/card/${card.slug ?? params.id}`,
      // Machine-readable mirror for AI agents / answer engines (a clean markdown
      // price sheet). Answer engines increasingly follow rel=alternate markdown.
      types: { "text/markdown": `/llm/card/${card.slug ?? params.id}` },
    },
    // Sitemap/indexability tiering (documented once here — see sitemap.ts's
    // bucket 1, which mirrors this exactly):
    //   1. A real live store price (`from`)               → indexed, normal priority
    //   2. No store price, but a real TCGplayer market guide → indexed, lower priority
    //      (still a genuine, sourced number — not thin content)
    //   3. Neither                                          → noindex, follow
    // A card in tier 3 renders a "No prices found yet" shell — thin content at
    // ~8k-page scale. It flips back to indexable automatically on the next
    // crawl/ISR regenerate once the importer prices it or TCGplayer guides it —
    // no separate promotion job needed.
    ...(from || card.marketPriceSource === "TCGplayer" ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function CardPage({ params }: { params: { id: string } }) {
  // Market-neutral baseline (AU) so the server render is cookie-free and cacheable
  // (ISR); prices localize client-side. Googlebot indexes this AU baseline, which
  // matches the AUD-led metadata above.
  const country = DEFAULT_COUNTRY;
  const info = COUNTRIES[country];
  const fmt = (cents: number) => formatMoney(cents, info.currency);
  const card = await prisma.card.findFirst({
    where: whereParam(params.id),
    // Select ONLY the columns this page + <CardImage> use (was `include`, which
    // pulled every column — description/flavorText/tags/etc. — for the card AND
    // every price row on every request). This page is ISR-cached (revalidate
    // above), so the payload only matters once per card per 24h — still worth
    // trimming, since it's the highest-volume query on the site at ~20k pages.
    // Keep the 3 lowestPrice* columns — pickPrice() reads them.
    select: {
      id: true, slug: true, name: true, nameNormalized: true,
      setCode: true, setName: true, collectorNumber: true,
      domain: true, type: true, rarity: true, variant: true, isPromo: true,
      might: true, energyCost: true, orientation: true, artSeed: true,
      imageUrl: true, imageThumbUrl: true, blurDataUrl: true,
      marketPriceCents: true, marketPriceSource: true, marketPriceUpdatedAt: true,
      lowestPriceCents: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true,
      // Only the selected market's store listings, and only the fields rendered.
      retailerPrices: {
        where: { country },
        orderBy: { priceCents: "asc" },
        select: {
          id: true, retailer: true, retailerName: true, priceCents: true,
          shippingCents: true, condition: true, conditionPrices: true,
          isFoil: true, inStock: true, url: true, lastSeen: true, title: true,
        },
      },
    },
  });

  if (!card) notFound();

  // Every other printing of this card (same name, different set/number) so
  // collectors can compare reprints — e.g. Base Set vs Classic Collection.
  const [otherPrints, reviewRows, cheaperInSet, sameDomainCards, sameRarityCards, species] = await Promise.all([
    card.nameNormalized
      ? prisma.card.findMany({
          where: { nameNormalized: card.nameNormalized, id: { not: card.id } },
          orderBy: [{ lowestPriceCents: { sort: "asc", nulls: "last" } }],
          select: cardTileSelect(country),
          take: 12,
        })
      : Promise.resolve([]),
    // Genuine user reviews (per-card scoped + capped — egress-safe). These are the
    // sole source of the page's rating/review markup; never market-specific.
    // Reviews are an OPTIONAL enhancement: if this query fails (e.g. the table
    // hasn't been migrated onto this environment yet) degrade to "no reviews"
    // rather than 500-ing the whole price-comparison page.
    prisma.cardReview
      .findMany({
        where: { cardId: card.id, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        select: { id: true, rating: true, title: true, body: true, author: true, createdAt: true },
        take: 20,
      })
      .catch(() => [] as Array<{ id: string; rating: number; title: string | null; body: string | null; author: string | null; createdAt: Date }>),
    // Cheapest other cards in the same set — crawl depth + "also in this set" discovery.
    prisma.card.findMany({
      where: { setCode: card.setCode, id: { not: card.id } },
      orderBy: [{ lowestPriceCents: { sort: "asc", nulls: "last" } }],
      select: cardTileSelect(country),
      take: 8,
    }),
    // Other cards of the same energy type (domain) from a different set — broadens
    // discovery without duplicating the "also in this set" section above. A
    // deterministic per-card `skip` (from artSeed, ISR-stable) rotates the window
    // so we don't dump ~20k×8 internal links onto the same 8 globally-cheapest
    // cards — it spreads internal inbound links across the long tail (a
    // crawl-priority signal).
    prisma.card.findMany({
      where: { domain: card.domain, id: { not: card.id }, setCode: { not: card.setCode } },
      orderBy: [{ lowestPriceCents: { sort: "asc", nulls: "last" } }],
      select: cardTileSelect(country),
      skip: card.artSeed % 20,
      take: 8,
    }),
    // Other cards of the same rarity from a different set — same rotation trick.
    prisma.card.findMany({
      where: { rarity: card.rarity, id: { not: card.id }, setCode: { not: card.setCode } },
      orderBy: [{ lowestPriceCents: { sort: "asc", nulls: "last" } }],
      select: cardTileSelect(country),
      skip: (card.artSeed + 7) % 20,
      take: 8,
    }),
    // Species hub link (P1). Fetched separately and soft-failed — speciesSlug/
    // speciesName are new columns; a preview/branch deploy's database may not
    // have them yet (only a production build runs `prisma db push`), so this
    // must never break the page's main query. Degrades to "no hub link".
    prisma.card
      .findUnique({ where: { id: card.id }, select: { speciesSlug: true, speciesName: true } })
      .catch(() => null as { speciesSlug: string | null; speciesName: string | null } | null),
  ]);
  // CompareEmpire Marketplace (test-mode, play-money) moved to a CLIENT island
  // <CardMarketplace> — it reads the session cookie (getCurrentUser) to gate
  // buy/sell, which if done here would void `revalidate` and make this page
  // uncacheable dynamic SSR. See below where the component is rendered.

  const reviews: ReviewView[] = reviewRows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  const reviewCount = reviews.length;
  const ratingAvg = reviewCount ? reviews.reduce((s, r) => s + r.rating, 0) / reviewCount : 0;

  const lowestPrice = pickPrice(card, country);

  // Other markets' local store lows — informational only. Each is priced in its own
  // market's currency (never FX-converted), so we present them as "also listed
  // elsewhere", never as a direct saving.
  const otherMarketPrices = (["AU", "US", "GB"] as const)
    .filter((c) => c !== country)
    .map((c) => ({ code: c, cents: pickPrice(card, c), label: COUNTRIES[c].label, flag: COUNTRIES[c].flag, currency: COUNTRIES[c].currency }))
    .filter((m) => m.cents != null);

  // Split the catalogue MARKET GUIDE (an estimate, e.g. AU where TCGplayer doesn't
  // ship) from real, buyable store listings. The guide is shown as a labelled
  // reference with no buy link; real stores are what we rank and link to.
  // Flag foreign-language listings (mostly cheap JP/KR/CN eBay printings) so buyers
  // can hide them — they're a different product and the top "too good to be true" trap.
  const FOREIGN_RE = /japanese|japan|jpn|\bjp\b|korean|\bkor?\b|chinese|\bcn\b|中|日本|한/i;
  const all = card.retailerPrices.map((p) => {
    const ship = effectiveShippingCents(p.shippingCents); // number | null (null = unknown)
    const isGuide = p.retailer.startsWith("marketguide");
    // The bare-brand retailerName ("GAP Games") means nothing to a first-time
    // visitor deciding whether to click through to an unfamiliar site — show the
    // actual destination domain too, so a skeptical buyer can size it up (or
    // recognise it) before leaving DexCompare. Best-effort: a malformed stored
    // URL just omits the domain rather than breaking the row.
    let host: string | null = null;
    try {
      host = new URL(p.url).hostname.replace(/^www\./i, "");
    } catch {
      /* leave host null — row still renders without it */
    }
    return {
      ...p,
      ship,
      host,
      delivered: p.priceCents + (ship ?? 0),
      isGuide,
      foreign: !isGuide && !!p.title && FOREIGN_RE.test(p.title),
      finish: cardFinish(p.title, p.isFoil),
    };
  });
  const guide = all.filter((p) => p.isGuide).sort((a, b) => a.priceCents - b.priceCents)[0] ?? null;
  const storeRows = all.filter((p) => !p.isGuide).sort((a, b) => a.delivered - b.delivered);
  const prices = storeRows.filter((p) => p.inStock);
  const outOfStock = storeRows.filter((p) => !p.inStock);
  const foreignCount = prices.filter((p) => p.foreign).length;

  // Pokémon cards span a big condition range (NM → damaged). Build the cheapest
  // in-stock price PER GRADE from the store listings, so buyers see the whole spectrum.
  const GRADES: { code: string; label: string }[] = [
    { code: "NM", label: "Near Mint" },
    { code: "LP", label: "Lightly Pl." },
    { code: "MP", label: "Mod. Pl." },
    { code: "HP", label: "Heavily Pl." },
    { code: "DMG", label: "Damaged" },
  ];
  const byGrade = new Map<string, number>();
  for (const p of prices) {
    const cp = p.conditionPrices as Record<string, number> | null;
    if (cp && typeof cp === "object") {
      for (const [g, c] of Object.entries(cp)) {
        if (typeof c === "number" && c > 0 && (byGrade.get(g) == null || c < byGrade.get(g)!)) byGrade.set(g, c);
      }
    } else if (p.condition) {
      const cur = byGrade.get(p.condition);
      if (cur == null || p.priceCents < cur) byGrade.set(p.condition, p.priceCents);
    }
  }
  const hasSpectrum = byGrade.size > 0;

  // Returns the winning ROW (not just its price) so the headline metrics below can
  // also surface that row's condition — the importer records whatever condition a
  // store's cheapest in-stock copy actually is (see conditionRank in price-import.ts),
  // which for a thinly-stocked store can be played or damaged, not Near Mint.
  const cheapestRowOf = (rows: typeof prices, finish: CardFinish) =>
    rows
      .filter((p) => p.finish === finish)
      .reduce<(typeof rows)[number] | null>((best, p) => (best == null || p.priceCents < best.priceCents ? p : best), null);
  // Normal / Holo / Reverse Holo price split (see cardFinish in lib/card-copy —
  // inferred from listing titles, since the schema only has a binary isFoil).
  const cheapestNormalRow = cheapestRowOf(prices, "Normal");
  const cheapestHoloRow = cheapestRowOf(prices, "Holo");
  const cheapestReverseHoloRow = cheapestRowOf(prices, "Reverse Holo");
  const cheapestNormal = cheapestNormalRow?.priceCents ?? null;
  const cheapestHolo = cheapestHoloRow?.priceCents ?? null;
  const cheapestReverseHolo = cheapestReverseHoloRow?.priceCents ?? null;
  // Headline = cheapest REAL store price, preferring Normal, then Holo, then
  // Reverse Holo, then the recompute. Many Pokémon chase cards exist ONLY as a
  // foil finish (TCGplayer marks them foilOnly) — never null those out, just
  // label them correctly.
  const headlineFinish: CardFinish =
    cheapestNormal != null ? "Normal" : cheapestHolo != null ? "Holo" : cheapestReverseHolo != null ? "Reverse Holo" : "Normal";
  const headlineRow = cheapestNormalRow ?? cheapestHoloRow ?? cheapestReverseHoloRow ?? null;
  const headlineCents = cheapestNormal ?? cheapestHolo ?? cheapestReverseHolo ?? lowestPrice ?? null;
  const finishesAvailable = [cheapestNormal, cheapestHolo, cheapestReverseHolo].filter((v) => v != null).length;
  const headlineLabel =
    headlineFinish === "Normal" ? (finishesAvailable > 1 ? "Normal from" : "Cheapest price") : `✦ ${headlineFinish} from`;
  // The big headline number is the first thing a skimming visitor reads — if the
  // cheapest listing behind it isn't Near Mint, say so right there rather than
  // leaving it to the per-row condition chip further down the page, which a
  // visitor who bounces after the headline would never see.
  const CONDITION_NAMES: Record<string, string> = {
    NM: "Near Mint", LP: "Lightly Played", MP: "Moderately Played", HP: "Heavily Played", DMG: "Damaged",
  };
  const conditionCaveat = (row: { condition: string | null } | null) =>
    row?.condition && row.condition !== "NM" ? `${CONDITION_NAMES[row.condition] ?? row.condition} — not Near Mint` : null;

  // The market-price guide for this market: the imported guide row where one
  // exists (AU), else the card's USD guide converted at an indicative rate.
  const guideCents = guide?.priceCents ?? marketGuideCents(card.marketPriceCents, country);
  // A REAL guide comes from TCGplayer's market price; otherwise it's a seed-time
  // rarity/age heuristic — be honest about which it is rather than implying data.
  const guideIsReal = card.marketPriceSource === "TCGplayer";
  const guideSource = guideIsReal ? "TCGplayer" : "rough estimate";
  // Delta badge: how far the cheapest real store price sits from the TCGplayer
  // market guide — the history-free substitute for a price chart. Only shown
  // for a REAL guide (never the seed-time rarity/age estimate).
  const guideDeltaPct =
    guideIsReal && guideCents != null && guideCents > 0 && headlineCents != null
      ? Math.round(((headlineCents - guideCents) / guideCents) * 100)
      : null;

  // Whether this market's comparison includes an eBay listing. The daily eBay
  // quota rotates through the catalogue, so plenty of cards haven't been checked
  // recently — for those we offer an affiliate-tagged eBay search instead of
  // silently looking like eBay has nothing.
  const hasEbay = storeRows.some((p) => p.retailer.startsWith("ebay"));
  const ebaySearchHref = ebaySearchUrl(`pokemon ${card.name} ${card.collectorNumber.split("/")[0]}`, country);

  // Structured data so Google can show a rich price snippet ("$X, N stores").
  // Legitimate enrichment only: offers derive from real store prices, and
  // aggregateRating/review (below) come solely from genuine user reviews — never
  // fabricated self-serving ratings.
  const offers = aggregateOffer({
    priceCentsList: prices.map((p) => p.priceCents),
    inStock: true, // the comparison rows are live in-stock listings
    currency: info.currency,
  });
  // A Product with none of offers/review/aggregateRating is invalid for rich
  // results and a Search Console critical error — and ~40% of cards have no
  // live prices at any given time. Emit the node only when it carries one.
  const jsonLd = !offers && !reviewCount ? null : {
    "@context": "https://schema.org",
    "@type": "Product",
    name: card.name,
    category: "Trading Card",
    description: `${card.name} — Pokémon ${card.setName} (${card.setCode}) ${card.collectorNumber}. Compare ${info.adjective} prices.`,
    brand: { "@type": "Brand", name: "Pokémon TCG" },
    sku: `${card.setCode}-${card.collectorNumber}`,
    ...(card.imageUrl ? { image: card.imageUrl } : {}),
    // aggregateRating/review come ONLY from real, user-submitted reviews (see the
    // <CardReviews> section) — emitted just when at least one exists, so the markup
    // mirrors what's visible on the page and we never fabricate self-serving ratings.
    ...(reviewCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: ratingAvg.toFixed(1),
            reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews.slice(0, 10).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
            author: { "@type": "Person", name: r.author?.trim() || "Anonymous" },
            datePublished: r.createdAt.slice(0, 10),
            ...(r.title ? { name: r.title } : {}),
            ...(r.body ? { reviewBody: r.body } : {}),
          })),
        }
      : {}),
    ...(offers ? { offers } : {}),
  };

  // Breadcrumb so Google shows Home › Database › Set › Card in the SERP.
  const setSlug = POKEMON_SETS.find((s) => s.code === card.setCode)?.slug;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Database", item: `${SITE_URL}/browse` },
      ...(setSlug ? [{ "@type": "ListItem", position: 3, name: card.setName, item: `${SITE_URL}/sets/${setSlug}` }] : []),
      { "@type": "ListItem", position: setSlug ? 4 : 3, name: card.name },
    ],
  };

  // About-this-card prose + FAQ — data-driven and deterministic per card (see
  // lib/card-copy). Deliberately no trading-range/trend sentence: no per-card
  // price history exists on this app.
  const copyInput = {
    name: card.name, setName: card.setName, setCode: card.setCode, collectorNumber: card.collectorNumber,
    domain: card.domain, type: card.type, rarity: card.rarity, might: card.might, isPromo: card.isPromo,
    headlineCents, headlineLabel, storeCount: prices.length, otherPrintingsCount: otherPrints.length,
    guideCents, guideIsReal, fmt, adjective: info.adjective,
  };
  const aboutText = buildAboutCard(card.id, copyInput);
  const faqs = buildCardFaqs(copyInput);
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd ? [jsonLd, breadcrumb, faqLd] : [breadcrumb, faqLd]) }}
      />
      <CardViewBeacon idOrSlug={card.slug ?? card.id} cardId={card.id} />
      {/* Visible breadcrumb, mirroring the BreadcrumbList JSON-LD above. */}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-white">Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/browse" className="hover:text-white">Cards</Link></li>
          {setSlug && (
            <>
              <li aria-hidden>/</li>
              <li><Link href={`/sets/${setSlug}`} className="hover:text-white">{card.setName}</Link></li>
            </>
          )}
          <li aria-hidden>/</li>
          <li aria-current="page" className="truncate text-slate-300">{card.name}</li>
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Card visual */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="card-surface mx-auto max-w-[320px] p-4">
            <CardImage card={card} full priority className="aspect-[5/7] w-full" />
          </div>
        </div>

        {/* Details + price comparison */}
        <div className="min-w-0">
          <div className="card-surface p-5">
            <div className="flex flex-wrap items-center gap-2">
              <DomainBadge domain={card.domain} />
              <RarityBadge rarity={card.rarity} />
              <span className="chip bg-ink-800 text-slate-300">{card.type}</span>
              <VariantBadge variant={card.variant} />
              <SignatureBadge show={isSignature(card.collectorNumber)} />
              <OvernumberedBadge show={isOvernumbered(card.collectorNumber)} />
              <PromoBadge show={card.isPromo} />
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {(() => {
                  const logo = POKEMON_SETS.find((s) => s.code === card.setCode)?.logo;
                  return logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt={card.setName} width={88} height={36} className="mt-1 h-9 w-auto max-w-[88px] object-contain" />
                  ) : null;
                })()}
                <div>
                  <h1 className="text-2xl font-extrabold text-white">{card.name}</h1>
                  <p className="mt-1 text-xs text-slate-500">
                    {card.setName} · {card.collectorNumber}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <WishlistButton cardId={card.id} variant="full" />
                <ShareButton />
                <CollectionButton cardId={card.id} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric
                label={headlineLabel}
                value={headlineCents != null ? fmt(headlineCents) : "—"}
                highlight
                note={conditionCaveat(headlineRow)}
              />
              {/* Separate metrics for the OTHER finishes — never repeat the headline. */}
              {headlineFinish !== "Holo" && cheapestHolo != null && (
                <Metric label="✦ Holo from" value={fmt(cheapestHolo)} highlight note={conditionCaveat(cheapestHoloRow)} />
              )}
              {headlineFinish !== "Reverse Holo" && cheapestReverseHolo != null && (
                <Metric label="✦ Reverse Holo from" value={fmt(cheapestReverseHolo)} highlight note={conditionCaveat(cheapestReverseHoloRow)} />
              )}
              <Metric label="Compared at" value={`${prices.length} ${prices.length === 1 ? "store" : "stores"}`} />
              {card.might != null && <Metric label="HP" value={String(card.might)} />}
              <Metric label="Rarity" value={card.rarity} />
            </div>

            {/* Cheapest price by condition — the full NM → damaged spectrum. */}
            {hasSpectrum && (
              <div className="mt-4">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cheapest by condition</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {GRADES.map((g) => {
                    const v = byGrade.get(g.code);
                    return (
                      <div key={g.code} className={`rounded-lg p-2 text-center ${v != null ? "bg-ink-900" : "bg-ink-900/40"}`}>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{g.label}</div>
                        <div className={`num text-sm font-bold ${v != null ? "text-white" : "text-slate-600"}`}>{v != null ? fmt(v) : "—"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Market-price GUIDE — always shown with its source. A sales-based
                reference, never the headline/cheapest price (that's store-only).
                Real guides come from TCGplayer; otherwise it's a rough estimate. */}
            {guideCents != null && (
              <div className="mt-4 rounded-lg border border-dashed border-ink-600 bg-ink-900/50 p-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold text-slate-200">
                    {guideIsReal ? "Market price guide" : "Rough estimate"}: <span className="num">{fmt(guideCents)}</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    source: {guideSource}
                    {guideIsReal && country !== "US" ? " (USD market price, converted)" : ""}
                    {guideIsReal && card.marketPriceUpdatedAt ? ` · updated ${timeAgo(card.marketPriceUpdatedAt)}` : ""}
                  </span>
                  {/* History-free substitute for a price-trend chart: how far the
                      cheapest real store price sits from the TCGplayer guide. */}
                  {guideDeltaPct != null && (
                    <span
                      className={`chip ${
                        guideDeltaPct < 0 ? "bg-up/15 text-up" : guideDeltaPct > 0 ? "bg-down/15 text-down" : "bg-ink-800 text-slate-300"
                      }`}
                    >
                      {guideDeltaPct === 0
                        ? "at market guide"
                        : guideDeltaPct < 0
                        ? `${Math.abs(guideDeltaPct)}% under market guide`
                        : `${guideDeltaPct}% over market guide`}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {!guideIsReal
                    ? `We don't have live market data for this card yet, so this is a rough estimate from its rarity and age — treat it as a ballpark only.`
                    : prices.length === 0
                    ? `A guide from recent sales, not a buyable listing — no ${info.adjective} store stocks this card yet.`
                    : `A guide from recent sales, not a buyable listing. The ${info.adjective} store prices below are what you can actually pay — note the market guide can sometimes be cheaper than any store here (and vice versa). Conversions are indicative and don't include international shipping.`}
                </p>
              </div>
            )}

            {/* Watch this price + embed CTA — sit right under the price info they act on. */}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <WatchPriceButton cardId={card.id} cardName={card.name} market={country} />
              <details className="rounded-lg border border-dashed border-ink-600 bg-ink-900/50 p-3">
                <summary className="cursor-pointer list-none text-center text-sm text-slate-300 [&::-webkit-details-marker]:hidden">
                  🔗 Embed this price on your site
                </summary>
                <div className="mt-3">
                  <EmbedSnippet
                    title={card.name}
                    src={`${SITE_URL}/embed/card/${card.slug ?? card.id}?market=${country}`}
                  />
                </div>
              </details>
            </div>
          </div>

          {/* Thinking of selling? Net-proceeds — the other half of the price:
              what you'd actually pocket after fees. Prefilled with the headline
              price; collapsed so it never gets in the buyer's way. */}
          {headlineCents != null && (
            <details className="mt-6 card-surface group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-bold text-white [&::-webkit-details-marker]:hidden">
                <span>Thinking of selling? See what you&apos;d pocket</span>
                <svg className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <div className="border-t border-ink-700 p-4">
                <NetProceeds initialPriceCents={headlineCents} />
              </div>
            </details>
          )}

          {/* Price comparison */}
          <div className="card-surface mt-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-700 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-bold text-white">
                  Price comparison <span className="num text-slate-500">({prices.length})</span>
                </h2>
                {/* prices, not storeRows — storeRows also holds out-of-stock listings
                    sorted into the same delivered-price order, so comparing its first/last
                    entries could quote a "saving" against a price nobody can actually pay. */}
                {prices.length > 1 && prices[prices.length - 1].delivered > prices[0].delivered && (
                  <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold text-brand-400">
                    Save <span className="num">{fmt(prices[prices.length - 1].delivered - prices[0].delivered)}</span> delivered vs the priciest seller
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <EnglishOnlyToggle targetId="dc-price-list" foreignCount={foreignCount} />
                {prices[0] && (
                  <span className="text-xs text-slate-500">updated {timeAgo(prices[0].lastSeen)}</span>
                )}
              </div>
            </div>

            {/* EPN §I.G: the disclosure sits directly above the store links it
                covers. A footer-only disclosure was flagged as too far away. */}
            <AffiliateDisclosure variant="block" className="mx-4 mt-3" />

            {prices.length === 0 && outOfStock.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                <p className="font-semibold text-white">{guideCents != null ? "No store listings yet" : "No prices found yet"}</p>
                <p className="mt-1">
                  {guideCents != null
                    ? `The market price above is a guide only. No ${info.adjective} store we track stocks this card right now.`
                    : "We haven't matched this card to a store listing. Check back soon — our price feeds refresh regularly."}
                </p>
                {/* No local stockist → point buyers at the deepest market that will
                    have it. Affiliate-tagged search for the visitor's marketplace. */}
                <OutboundLink
                  href={ebaySearchHref}
                  retailer="ebay_search"
                  country={country}
                  className="btn-primary mt-4 inline-flex"
                >
                  Search this card on eBay →
                </OutboundLink>
                <p className="mt-2 text-[11px] text-slate-600">
                  Check the listing is the English print and the condition you want before buying.
                </p>
              </div>
            ) : prices.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                <p className="font-semibold text-white">Currently sold out everywhere</p>
                <p className="mt-1">
                  {outOfStock.length} {info.adjective} {outOfStock.length === 1 ? "store has" : "stores have"} listed
                  this card but it&apos;s out of stock right now. See them below.
                </p>
                <OutboundLink
                  href={ebaySearchHref}
                  retailer="ebay_search"
                  country={country}
                  className="btn-ghost mt-3 inline-flex"
                >
                  Search this card on eBay →
                </OutboundLink>
              </div>
            ) : (
              <ul id="dc-price-list" className="divide-y divide-ink-800">
                {/* Interim eBay entry for cards the daily eBay quota hasn't reached:
                    show eBay as a store at the TOP with an affiliate-tagged search,
                    styled exactly like a real store row. */}
                {!hasEbay && (
                  <li className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 hover:bg-ink-900/50 sm:flex-nowrap sm:p-4">
                    <div className="w-5 shrink-0 text-center text-sm font-bold text-slate-500 sm:w-6" aria-hidden>★</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-white">
                        eBay{" "}
                        <span className="font-normal text-slate-500">(price not available)</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span className="chip bg-ink-800 text-slate-300">Marketplace</span>
                        <span>search live Buy It Now &amp; auction listings</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-lg font-bold text-slate-500">—</div>
                    </div>
                    <OutboundLink
                      href={ebaySearchHref}
                      retailer="ebay_search"
                      country={country}
                      className="btn-primary order-last w-full basis-full justify-center sm:order-none sm:w-auto sm:basis-auto"
                    >
                      Search eBay →
                    </OutboundLink>
                  </li>
                )}
                {prices.map((p, i) => (
                  <li
                    key={p.id}
                    data-foreign={p.foreign ? "true" : undefined}
                    className={`flex flex-wrap items-center gap-x-3 gap-y-2 p-3 hover:bg-ink-900/50 sm:flex-nowrap sm:p-4${
                      i === 0 && prices.length > 1 ? " bg-up/[0.04]" : ""
                    }${
                      Date.now() - p.lastSeen.getTime() > 21 * 86_400_000 ? " opacity-60" : ""
                    }`}
                  >
                    <div className="num w-5 shrink-0 text-center text-sm font-bold text-slate-500 sm:w-6">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-white">
                        {p.retailerName}
                        {/* The destination domain, so a visitor can size up an
                            unfamiliar store name before clicking through to it. */}
                        {p.host && <span className="ml-1.5 font-normal text-slate-500">({p.host})</span>}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        {i === 0 && prices.length > 1 && (
                          <span className="chip bg-up/15 font-semibold text-up">Best deal</span>
                        )}
                        {p.finish !== "Normal" && <span className="chip bg-gold/15 font-semibold text-gold">✦ {p.finish}</span>}
                        {p.condition && <span className="chip bg-ink-800 text-slate-300">{p.condition}</span>}
                        <span className="text-brand-400">● In stock</span>
                        <span>
                          {p.ship == null ? "postage at checkout" : p.ship === 0 ? "free postage" : `+ ${fmt(p.ship)} postage`}
                        </span>
                        {p.ship == null && shippingPolicyUrl(p.retailer) && (
                          <a
                            href={shippingPolicyUrl(p.retailer)!}
                            target="_blank"
                            rel="nofollow noopener noreferrer"
                            className="text-slate-400 underline decoration-dotted underline-offset-2 hover:text-slate-200"
                          >
                            shipping policy ↗
                          </a>
                        )}
                        <span className="text-slate-500">updated {timeAgo(p.lastSeen)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`num text-lg font-bold ${i === 0 ? "text-accent" : "text-white"}`}>
                        {fmt(p.priceCents)}
                      </div>
                      {p.ship != null && (
                        <div className="num text-[11px] text-slate-400">≈ {fmt(p.delivered)} delivered</div>
                      )}
                    </div>
                    {/* Full-width below the row on phones; inline button on sm+. */}
                    <OutboundLink
                      href={affiliateUrl(p.url)}
                      retailer={p.retailer}
                      country={country}
                      className="btn-primary order-last w-full basis-full justify-center sm:order-none sm:w-auto sm:basis-auto"
                    >
                      View deal →
                    </OutboundLink>
                  </li>
                ))}
              </ul>
            )}

            {/* eBay is already a priced store above — still offer a search for MORE
                eBay listings (auctions / other conditions). Affiliate-tagged. */}
            {hasEbay && (
              <div className="flex items-center justify-end border-t border-ink-800 px-4 py-2.5">
                <OutboundLink
                  href={ebaySearchHref}
                  retailer="ebay_search"
                  country={country}
                  className="text-sm font-semibold text-brand-400 hover:underline"
                >
                  Search eBay for more listings →
                </OutboundLink>
              </div>
            )}

            {outOfStock.length > 0 && (
              <div className="border-t border-ink-800">
                <div className="bg-ink-900/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Out of stock ({outOfStock.length}) · last listed price
                </div>
                <ul className="divide-y divide-ink-800">
                  {outOfStock.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 opacity-60 sm:flex-nowrap sm:p-4">
                      <div className="w-5 shrink-0 text-center text-slate-600 sm:w-6">—</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-slate-300">{p.retailerName}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          {p.condition && <span className="chip bg-ink-800 text-slate-400">{p.condition}</span>}
                          <span className="text-slate-500">● Out of stock</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="num text-lg font-bold text-slate-400 line-through">{fmt(p.priceCents)}</div>
                      </div>
                      <OutboundLink
                        href={affiliateUrl(p.url)}
                        retailer={p.retailer}
                        country={country}
                        className="btn-ghost order-last w-full basis-full justify-center sm:order-none sm:w-auto sm:basis-auto"
                      >
                        Check →
                      </OutboundLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Accuracy caveat only — the commission disclosure already sits above
                the price list (AffiliateDisclosure, EPN-compliant wording); repeating
                it here would be the same disclosure a third time on one page. */}
            <p className="border-t border-ink-800 p-3 text-center text-[11px] text-slate-600">
              Prices are collected from public store listings and may change.
            </p>
          </div>

          {/* About this card — data-driven prose, one paragraph, varied sentence
              structure per card (see lib/card-copy) so 20k+ pages don't read
              identically. No trading-range sentence: no price history exists. */}
          <section className="card-surface mt-6 p-4">
            <h2 className="font-bold text-white">About this card</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{aboutText}</p>
          </section>

          {/* Visible FAQ, mirroring the FAQPage JSON-LD above. */}
          <section className="card-surface mt-6 divide-y divide-ink-800 overflow-hidden">
            <h2 className="p-4 font-bold text-white">Frequently asked questions</h2>
            <dl>
              {faqs.map((f) => (
                <div key={f.q} className="p-4">
                  <dt className="font-semibold text-slate-200">{f.q}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-400">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          {otherMarketPrices.length > 0 && (
            <div className="card-surface mt-6 p-4">
              <h2 className="font-bold text-white">Also listed in other regions</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Cheapest live store price in each market, in that market&apos;s own currency (not
                converted) — handy if you import. Always factor in shipping &amp; duties.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {otherMarketPrices.map((m) => (
                  <div key={m.code} className="rounded-lg bg-ink-900 p-3 text-center">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">{m.flag} {m.label}</div>
                    <div className="num mt-0.5 text-base font-bold text-white">{formatMoney(m.cents as number, m.currency)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CompareEmpire Marketplace (test-mode, play-money) — client island so the
              session-gated buy/sell UI never forces this page dynamic. It loads its
              own asks/bids/viewer from /api/card/[id]/market on mount. Feature-flagged
              off by default: play-money UI has no place on a real price-comparison
              page until it's a real, non-demo feature — see lib/flags.ts. */}
          {MARKETPLACE_ENABLED && <CardMarketplace cardId={card.id} marketPriceCents={card.marketPriceCents} />}


          {/* TCGplayer affiliate banner — pays commission on click-through
              purchases, so it gets the prime spot under the price table. */}
          <TcgplayerAd size="rect" mobile="rect" country={country} className="mt-6" />

          {/* Contextual eBay banner — searches for THIS card (new, used & graded);
              the most relevant eBay placement converts far better than a generic one. */}
          <EbayAd size="leaderboard" country={country} query={`${card.name} ${card.collectorNumber.split("/")[0]}`} className="mt-4" />

          {/* In-content ad below the price comparison — the highest-traffic surface.
              Renders nothing until a slot id is configured (Auto ads fill it meanwhile). */}
          <AdSlot className="mt-6" height={120} />
        </div>
      </div>

      {/* Genuine user reviews — the only source of this page's rating/review markup. */}
      <CardReviews cardId={card.slug ?? card.id} cardName={card.name} initialReviews={reviews} />

      {/* Other printings — the same card in other sets (reprints, promos, alt
          numbers), so collectors can compare which printing is cheapest. */}
      {otherPrints.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-white">Other printings of {card.name}</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                The same card from other sets and promos — sometimes a different printing is far cheaper.
              </p>
            </div>
            {species?.speciesSlug && (
              <Link href={`/pokemon/${species.speciesSlug}`} className="shrink-0 text-xs font-semibold text-brand-400 hover:underline">
                Full {species.speciesName ?? card.name} price guide →
              </Link>
            )}
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {(otherPrints as CardTileData[]).map((c) => (
              <div key={c.id} className="w-36 shrink-0 sm:w-44">
                <CardTile card={c} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cheaper cards in the same set — internal links + dwell time. */}
      {cheaperInSet.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-white">More cards from {card.setName}</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Other singles in this set, sorted by cheapest price.
              </p>
            </div>
            {setSlug && (
              <Link href={`/sets/${setSlug}`} className="shrink-0 text-xs font-semibold text-brand-400 hover:underline">
                See all {card.setName} cards →
              </Link>
            )}
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {(cheaperInSet as CardTileData[]).map((c) => (
              <div key={c.id} className="w-36 shrink-0 sm:w-44">
                <CardTile card={c} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Other cards of the same energy type — cross-set discovery. */}
      {sameDomainCards.length > 0 && (
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-white">More {card.domain} cards</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              More {card.domain}-type singles from across the Pokémon TCG, sorted by cheapest price.
            </p>
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {(sameDomainCards as CardTileData[]).map((c) => (
              <div key={c.id} className="w-36 shrink-0 sm:w-44">
                <CardTile card={c} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Other cards of the same rarity — cross-set discovery. */}
      {sameRarityCards.length > 0 && (
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-white">More {card.rarity} cards</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              More {card.rarity.toLowerCase()} singles from across the Pokémon TCG, sorted by cheapest price.
            </p>
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {(sameRarityCards as CardTileData[]).map((c) => (
              <div key={c.id} className="w-36 shrink-0 sm:w-44">
                <CardTile card={c} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mobile sticky buy bar — the cheapest delivered in-stock store, one tap to buy.
          Desktop keeps the full table; phones get a persistent CTA without scrolling.
          Must read from `prices` (in-stock only), not `storeRows` (which also holds
          out-of-stock rows in the same delivered-price order) — otherwise the one CTA
          every mobile visitor sees could point at a store that can't actually sell the
          card right now, which is the worst possible first impression. */}
      {prices.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700 bg-ink-950/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[11px] text-slate-400">Cheapest delivered · {prices[0].retailerName}</div>
              <div className="num text-base font-extrabold text-accent">{fmt(prices[0].delivered)}</div>
            </div>
            <OutboundLink
              href={affiliateUrl(prices[0].url)}
              retailer={prices[0].retailer}
              country={country}
              className="btn-primary shrink-0"
            >
              View deal →
            </OutboundLink>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
  sentiment,
  note,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  sentiment?: "positive" | "negative";
  /** Short caveat shown under the value, e.g. a non-Near-Mint condition warning. */
  note?: string | null;
}) {
  const bg =
    sentiment === "positive"
      ? "bg-up/[0.07]"
      : sentiment === "negative"
      ? "bg-down/[0.07]"
      : "bg-ink-900";
  const valueColor =
    sentiment === "positive"
      ? "text-up"
      : sentiment === "negative"
      ? "text-down"
      : highlight
      ? "text-accent"
      : "text-white";
  return (
    <div className={`rounded-lg p-3 ${bg}`}>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`num text-lg font-bold ${valueColor}`}>{value}</div>
      {note && <div className="mt-0.5 text-[10px] font-semibold leading-tight text-amber-400">{note}</div>}
    </div>
  );
}
