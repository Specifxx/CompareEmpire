import { homeRails } from "@/lib/data";
import { isRegion, REGIONS } from "@/lib/regions";

// GET /api/picks/<region>: eight products for the landing page's region grid (components/HomeRegionGrid.tsx): the region home's
// newest in-stock booster boxes and Elite Trainer Boxes (lib/data.ts homeRails), as small cards. Built like /api/browse: cached
// for a day and refreshed with each release, so a landing visit never reaches the data. /api/ is disallowed in robots.txt.
export const dynamic = "force-static";
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export interface Pick {
  slug: string;
  name: string;
  type: string;
  img: string | null;
  cents: number | null;
  stores: number;
  tcg: boolean;
}

export async function GET(_req: Request, { params }: { params: { region: string } }) {
  if (!isRegion(params.region)) return Response.json({ error: "unknown region" }, { status: 404 });
  const { boxes, etbs } = await homeRails(REGIONS[params.region].market);
  const mix = [...boxes.slice(0, 4), ...etbs.slice(0, 4)];
  const picks: Pick[] = mix.map((p) => ({
    slug: p.slug,
    name: p.name,
    type: p.productType,
    img: p.imageUrl,
    cents: p.lowestPriceCents,
    stores: p.inStockStores,
    tcg: p.marketplaceOpen,
  }));
  return Response.json({ region: params.region, picks }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } });
}
