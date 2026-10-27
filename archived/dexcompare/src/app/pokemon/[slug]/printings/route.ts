import { prisma } from "@/lib/db";
import { cardTileSelect, parsePageNum, parsePageSize } from "@/lib/cards";
import { DEFAULT_COUNTRY } from "@/lib/country";
import { POKEMON_SETS } from "@/lib/pokemon-sets";

// Filtered/sorted/paged printings for one species hub, as JSON.
//
// Why this exists: /pokemon/[slug] declared `export const revalidate` but
// destructured `searchParams` (set/era/rarity/sort/page/size) — a dynamic API in
// Next 14 — so the hub was in neither `routes` nor `dynamicRoutes` in the
// prerender manifest and every request hit Postgres. The page now renders the
// unfiltered, default-sorted first page (ISR-cached); the <SpeciesPrintings>
// island fetches from here as soon as the URL carries a filter/sort/page.
//
// Those permutation URLs were already noindex,follow (they exist for humans
// clicking a chip), and unlike the per-request SSR they replace, these responses
// are CDN-cacheable.
export const revalidate = 3600;

const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

const csv = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const url = new URL(req.url);
  const sets = csv(url.searchParams.get("set"));
  const eras = csv(url.searchParams.get("era"));
  const rarities = csv(url.searchParams.get("rarity"));
  const sort = url.searchParams.get("sort");
  const page = parsePageNum(url.searchParams.get("page") ?? undefined);
  const size = parsePageSize(url.searchParams.get("size") ?? undefined);

  // Same filter semantics the page used to apply server-side.
  const where: Record<string, unknown> = { speciesSlug: params.slug };
  if (sets.length) where.setCode = { in: sets };
  if (rarities.length) where.rarity = { in: rarities };
  if (eras.length) {
    const eraCodes = POKEMON_SETS.filter((s) => eras.includes(s.series)).map((s) => s.code);
    where.setCode = where.setCode
      ? { in: eraCodes.filter((c) => (where.setCode as { in: string[] }).in.includes(c)) }
      : { in: eraCodes };
  }

  // Default "relevance" = price descending (chase cards first) — unchanged.
  const orderBy =
    sort === "price_asc"
      ? [{ lowestPriceCents: { sort: "asc", nulls: "last" } }]
      : sort === "number"
      ? [{ setCode: "asc" }, { collectorNumber: "asc" }]
      : [{ lowestPriceCents: { sort: "desc", nulls: "last" } }];

  const [cards, total] = await Promise.all([
    prisma.card.findMany({
      where: where as never,
      orderBy: orderBy as never,
      select: cardTileSelect(DEFAULT_COUNTRY),
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.card.count({ where: where as never }),
  ]);

  return Response.json(
    { cards, total, page, size },
    { headers: { "Cache-Control": CACHE_CONTROL, "X-Robots-Tag": "noindex" } }
  );
}
