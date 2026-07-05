import { getGlobalIndex } from "@/lib/market-index";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { cardHref } from "@/lib/card-url";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// llms-full.txt — a single-file markdown snapshot an agent can ingest in one fetch:
// the live DexCompare Global Index plus the most-searched Pokémon cards with their
// lowest AU price. Best-effort: any DB/index hiccup just omits that block (never
// throws). Refreshed hourly. Uses DexCompare's points-based Global Index
// (base 100) and the AU lowest-price column.
export const revalidate = 3600;

const pct = (p: number | null | undefined) => (p == null ? "—" : `${p > 0 ? "+" : ""}${p}%`);
const round1 = (n: number | null): number | null => (n == null ? null : Math.round(n * 10) / 10);

export async function GET() {
  const lines: string[] = [];
  lines.push(`# ${SITE_NAME} — full text index`);
  lines.push("");
  lines.push(
    "> A machine-readable snapshot of the Pokémon TCG singles market on DexCompare. Prices are the lowest " +
      "live in-stock Australian price unless noted; the full per-market data is on each card page " +
      `(a clean markdown mirror lives at /llm/card/{slug}) and the index JSON is at ${SITE_URL}/api/v1/index.json.`
  );
  lines.push("");

  try {
    const idx = await getGlobalIndex({ kind: "all" });
    if (idx && idx.points.length) {
      const pts = idx.points;
      const first = pts[0];
      const last = pts[pts.length - 1];
      // Base-100 normalisation on the first tracked day (mirrors /market + index.json).
      const base = first.cents || 1;
      const level = (last.cents / base) * 100;
      const pctOver = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);
      const at = (daysBack: number) => pts[Math.max(0, pts.length - 1 - daysBack)];
      const startDay = first.day.toISOString().slice(0, 10);

      lines.push("## The DexCompare Global Index (search-weighted, currency-neutral, base 100)");
      lines.push(`- Level: ${level.toFixed(1)} (base 100 on ${startDay})`);
      lines.push(
        `- Change: 1d ${pct(round1(pctOver(last.cents, at(1).cents)))} · ` +
          `7d ${pct(round1(pctOver(last.cents, at(7).cents)))} · ` +
          `30d ${pct(round1(pctOver(last.cents, at(30).cents)))} · ` +
          `all-time ${pct(round1(pctOver(last.cents, first.cents)))}`
      );
      lines.push(
        `- Breadth: advancing ${idx.risers} / declining ${idx.fallers} / unchanged ${idx.flat} · ` +
          `tracked cards ${idx.trackedCards}`
      );
      lines.push(`- Full page: ${SITE_URL}/market · JSON: ${SITE_URL}/api/v1/index.json`);
      lines.push("");
    }
  } catch {
    /* omit the index block on error */
  }

  try {
    const cards = await prisma.card.findMany({
      where: { searchCount: { gt: 0 }, lowestPriceCents: { not: null } },
      orderBy: [{ searchCount: "desc" }, { viewCount: "desc" }],
      take: 100,
      select: { name: true, setCode: true, collectorNumber: true, slug: true, id: true, lowestPriceCents: true },
    });
    if (cards.length) {
      lines.push("## Most-searched Pokémon cards (lowest live AU price)");
      lines.push("");
      lines.push("| # | Card | Set | No. | Lowest (AUD) | URL |");
      lines.push("|---|---|---|---|---|---|");
      cards.forEach((c, i) => {
        const price = c.lowestPriceCents != null ? formatMoney(c.lowestPriceCents) : "—";
        lines.push(`| ${i + 1} | ${c.name} | ${c.setCode} | ${c.collectorNumber} | ${price} | ${SITE_URL}${cardHref(c)} |`);
      });
      lines.push("");
    }
  } catch {
    /* omit the cards block on error */
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
