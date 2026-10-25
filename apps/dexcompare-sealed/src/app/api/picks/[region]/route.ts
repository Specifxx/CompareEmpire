import { regionPicks } from "@/lib/picks";
import { isRegion } from "@/lib/regions";

// GET /api/picks/<region>: five products for the landing page's region grid (components/HomeRegionGrid.tsx): lib/picks.ts: the region
// home's newest in-stock booster boxes and Elite Trainer Boxes, most stocked first, as small cards. Built like /api/browse: cached
// for a day and refreshed with each release, so a landing visit never reaches the data. /api/ is disallowed in robots.txt.
export const dynamic = "force-static";
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export async function GET(_req: Request, { params }: { params: { region: string } }) {
  if (!isRegion(params.region)) return Response.json({ error: "unknown region" }, { status: 404 });
  const picks = await regionPicks(params.region);
  return Response.json({ region: params.region, picks }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } });
}
