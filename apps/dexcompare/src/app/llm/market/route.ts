import { getGlobalIndex } from "@/lib/market-index";
import { formatMoney } from "@/lib/format";
import { SITE_URL, SITE_NAME } from "@/lib/site";

// Clean markdown version of the DexCompare Index (/market) page, for AI agents
// (linked from llms.txt and the page's `alternate` type=text/markdown). Cheap for
// LLMs to ingest. Adapted from RiftCompare to DexCompare's points-based, base-100
// Global Index (currency-neutral, GB market not UK).
export const revalidate = 1800;

const md = (lines: string[]) =>
  new Response(lines.join("\n") + "\n", { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
const pct = (p: number | null | undefined) => (p == null ? "—" : `${p > 0 ? "+" : ""}${p}%`);

export async function GET() {
  const idx = await getGlobalIndex({ kind: "all" }).catch(() => null);
  const lines: string[] = [`# The ${SITE_NAME} Index`];

  if (!idx || idx.points.length === 0) {
    lines.push("", "The index is warming up — not enough price history yet. See " + `${SITE_URL}/market`);
    return md(lines);
  }

  const pts = idx.points;
  const first = pts[0];
  const last = pts[pts.length - 1];
  // Base-100 normalisation on the first tracked day (mirrors the /market page and
  // /api/v1/index.json). points[].cents already holds the index level ×100.
  const base = first.cents || 1;
  const level = (last.cents / base) * 100;
  const pctOver = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);
  const at = (daysBack: number) => pts[Math.max(0, pts.length - 1 - daysBack)];

  const startDay = first.day.toISOString().slice(0, 10);
  lines.push(
    "",
    "> A daily search-weighted price index of the most-searched Pokémon TCG singles " +
      "(base 100). Currency-neutral global composite blended across the AU, NZ, US and GB markets.",
    "",
    `- Level: ${level.toFixed(1)} (base 100 on ${startDay})`,
    `- Change: 1d ${pct(pctOver(last.cents, at(1).cents))} · 7d ${pct(pctOver(last.cents, at(7).cents))} · 30d ${pct(pctOver(last.cents, at(30).cents))} · all-time ${pct(pctOver(last.cents, first.cents))}`,
    `- Breadth: ${idx.risers} advancing / ${idx.fallers} declining / ${idx.flat} unchanged · ${idx.trackedCards} cards tracked`,
    `- Market cap (sum of TCGplayer guides): ${formatMoney(idx.marketCapCents, "USD")}`
  );

  if (idx.gainers.length) {
    lines.push("", "## Top gainers (7d)", "", "| Card | Set | 7d |", "|---|---|---|");
    for (const m of idx.gainers) {
      lines.push(`| ${m.card.name} | ${m.card.setCode} ${m.card.collectorNumber} | ${pct(m.pct)} |`);
    }
  }
  if (idx.losers.length) {
    lines.push("", "## Top losers (7d)", "", "| Card | Set | 7d |", "|---|---|---|");
    for (const m of idx.losers) {
      lines.push(`| ${m.card.name} | ${m.card.setCode} ${m.card.collectorNumber} | ${pct(m.pct)} |`);
    }
  }

  lines.push("", `Source: ${SITE_URL}/market · JSON: ${SITE_URL}/api/v1/index.json`);
  return md(lines);
}
