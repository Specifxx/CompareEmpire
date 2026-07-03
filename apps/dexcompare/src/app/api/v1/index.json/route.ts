import { getGlobalIndex } from "@/lib/market-index";
import { SITE_URL, SITE_NAME } from "@/lib/site";

// Public, machine-readable DexCompare Global Index — the daily search-weighted
// Pokémon singles market index. Agent / dashboard / answer-engine friendly.
// Adapted to DexCompare's points-based MarketIndexData (base 100 on day one).
export const revalidate = 1800;

export async function GET() {
  const idx = await getGlobalIndex({ kind: "all" }).catch(() => null);
  if (!idx || idx.points.length === 0) {
    return Response.json({ error: "index_unavailable" }, { status: 503, headers: { "X-Robots-Tag": "noindex" } });
  }

  const pts = idx.points;
  const first = pts[0];
  const last = pts[pts.length - 1];
  // Base-100 normalisation on the first tracked day (mirrors the /market page).
  const base = first.cents || 1;
  const level = (last.cents / base) * 100;
  const pctOver = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);
  const at = (daysBack: number) => pts[Math.max(0, pts.length - 1 - daysBack)];

  const body = {
    name: `${SITE_NAME} Global Index`,
    description:
      "Search-weighted daily index of the Pokémon singles market. Base 100 on the first tracked day; currency-neutral.",
    base: 100,
    startDay: first.day.toISOString().slice(0, 10),
    latestDay: last.day.toISOString().slice(0, 10),
    level: Number(level.toFixed(2)),
    change: {
      d1: round2(pctOver(last.cents, at(1).cents)),
      d7: round2(pctOver(last.cents, at(7).cents)),
      d30: round2(pctOver(last.cents, at(30).cents)),
      sinceStart: round2(pctOver(last.cents, first.cents)),
    },
    breadth: { advancing: idx.risers, declining: idx.fallers, unchanged: idx.flat },
    trackedCards: idx.trackedCards,
    series: pts.map((p) => ({ day: p.day.toISOString().slice(0, 10), level: Number(((p.cents / base) * 100).toFixed(2)) })),
    source: `${SITE_URL}/market`,
    license: "Free to cite with attribution to DexCompare (dexcompare.app).",
    generatedAt: new Date().toISOString(),
  };

  return Response.json(body, {
    headers: {
      "X-Robots-Tag": "noindex",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function round2(n: number | null): number | null {
  return n == null ? null : Number(n.toFixed(2));
}
