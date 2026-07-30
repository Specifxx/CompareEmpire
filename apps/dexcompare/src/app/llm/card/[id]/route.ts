import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { cardHref } from "@/lib/card-url";
import { SITE_URL } from "@/lib/site";

// Clean markdown version of a card page for AI agents (linked from the card
// page's `alternate` type=text/markdown). Per-region lowest prices + identity,
// no HTML — so answer engines cite DexCompare's prices directly. Ported from
// RiftCompare; DexCompare's UK column is lowestPriceCentsGb.
export const revalidate = 900;

// A dynamic-segment route handler can't be ISR-cached without
// generateStaticParams (this route appears in NEITHER `routes` nor
// `dynamicRoutes` in .next/prerender-manifest.json), so `revalidate` above is
// inert on its own — the header below is what actually caches it. Mirrors
// /api/v1/card/[id]/prices.json and /embed/card/[id]: the CDN serves it for
// s-maxage seconds and revalidates in the background, so an agent crawling
// thousands of these markdown mirrors costs one Postgres read per card per
// 15 minutes instead of one per request.
const CACHE_CONTROL = "public, s-maxage=900, stale-while-revalidate=1800";

const whereParam = (p: string) => ({ OR: [{ slug: p }, { id: p }] });
const line = (label: string, cents: number | null, currency: string) =>
  `- ${label}: ${cents == null ? "no tracked in-stock listing" : formatMoney(cents, currency)}`;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const card = await prisma.card
    .findFirst({
      where: whereParam(params.id),
      select: {
        id: true, slug: true, name: true, setName: true, setCode: true, collectorNumber: true,
        rarity: true,
        lowestPriceCents: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true,
      },
    })
    .catch(() => null);

  // 404s stay uncached (a card can appear at any import run) but are marked
  // noindex, matching prices.json.
  if (!card)
    return new Response("Not found\n", {
      status: 404,
      headers: { "Content-Type": "text/markdown; charset=utf-8", "X-Robots-Tag": "noindex" },
    });

  const url = `${SITE_URL}${cardHref(card)}`;
  const lines = [
    `# ${card.name} (${card.setCode} ${card.collectorNumber})`,
    "",
    `> Pokémon ${card.setName} card${card.rarity ? `, ${card.rarity}` : ""}. Lowest live in-stock price per market on DexCompare.`,
    "",
    "## Lowest price by market",
    line("Australia (AUD)", card.lowestPriceCents, "AUD"),
    line("United States (USD)", card.lowestPriceCentsUs, "USD"),
    line("United Kingdom (GBP)", card.lowestPriceCentsGb, "GBP"),
    "",
    `Compare all listings: ${url}`,
    `JSON: ${SITE_URL}/api/v1/card/${card.slug ?? card.id}/prices.json`,
  ];
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
      // Public machine-readable mirror — same CORS stance as prices.json so
      // agents/dashboards can read it from the browser.
      "Access-Control-Allow-Origin": "*",
    },
  });
}
