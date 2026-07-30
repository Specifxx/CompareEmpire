import { prisma } from "@/lib/db";
import { cardTileSelect, parsePageNum, parsePageSize } from "@/lib/cards";
import { DEFAULT_COUNTRY } from "@/lib/country";
import { resolveFacet } from "@/lib/card-facets";

// Paged card slice for one facet hub, as JSON.
//
// Why this exists: /cards/[facet]/[value] declared `export const revalidate` but
// destructured `searchParams` (page/size) — a dynamic API in Next 14 — so the
// route was in neither `routes` nor `dynamicRoutes` in the prerender manifest and
// every request hit Postgres with four queries. The page now renders the
// searchParams-free first page (ISR-cached); the <FacetCardGrid> island fetches
// deeper pages from here.
//
// Deeper pages were already noindex,follow, so they're human-only — and this
// endpoint is CDN-cacheable, which the full-page SSR it replaces was not.
export const revalidate = 3600;

const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(req: Request, { params }: { params: { facet: string; value: string } }) {
  const facet = await resolveFacet(params.facet, params.value).catch(() => null);
  if (!facet) {
    return Response.json({ error: "unknown_facet" }, { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  }

  const url = new URL(req.url);
  const page = parsePageNum(url.searchParams.get("page") ?? undefined);
  const size = parsePageSize(url.searchParams.get("size") ?? undefined);

  // Same order as the page's first page, so paging is a continuation of it.
  const cards = await prisma.card.findMany({
    where: facet.where,
    orderBy: [{ lowestPriceCents: { sort: "desc", nulls: "last" } }],
    select: cardTileSelect(DEFAULT_COUNTRY),
    skip: (page - 1) * size,
    take: size,
  });

  return Response.json(
    { cards, page, size },
    { headers: { "Cache-Control": CACHE_CONTROL, "X-Robots-Tag": "noindex" } }
  );
}
