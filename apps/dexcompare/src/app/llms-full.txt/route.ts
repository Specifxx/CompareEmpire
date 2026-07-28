import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { cardHref } from "@/lib/card-url";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// llms-full.txt — a single-file markdown snapshot an agent can ingest in one
// fetch: the most-searched Pokémon cards with their lowest AU price.
// Best-effort: any DB hiccup just omits the block (never throws). Refreshed
// hourly.
export const revalidate = 3600;

export async function GET() {
  const lines: string[] = [];
  lines.push(`# ${SITE_NAME} — full text index`);
  lines.push("");
  lines.push(
    "> A machine-readable snapshot of the Pokémon TCG singles market on DexCompare. Prices are the lowest " +
      "live in-stock Australian price unless noted; the full per-market data is on each card page " +
      `(a clean markdown mirror lives at /llm/card/{slug}).`
  );
  lines.push("");

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
