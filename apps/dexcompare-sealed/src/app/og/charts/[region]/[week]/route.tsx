import { ogCard } from "@/lib/og-card";
import { readPriceHistory } from "@/lib/price-history";
import { REGION_LIST, regionOrNotFound } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { publishedWeeks, weeklyChart } from "@/lib/weekly-chart";

// /og/charts/<region>/<week>: a weekly chart's share card: the week, the top rise and how many products moved. Static: one PNG per
// region and published week at build, from the price history file alone (lib/weekly-chart.ts).
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  const h = readPriceHistory();
  return REGION_LIST.flatMap((r) => publishedWeeks(h, r.market).map((week) => ({ region: r.region, week })));
}

export function GET(_req: Request, { params }: { params: { region: string; week: string } }) {
  const r = regionOrNotFound(params.region);
  const chart = weeklyChart(readPriceHistory(), r.market, params.week);
  if (!chart?.published) return new Response("Not found", { status: 404 });
  const top = chart.risers[0];
  return ogCard({
    tag: `Weekly chart · ${r.name}`,
    lines: [
      ["Magic sealed", false],
      ["price chart", false],
      [`week to ${formatRelease(chart.week)}`, true],
    ],
    size: 56,
    sub: top ? `Top rise +${top.pct}% · ${chart.risers.length} risers, ${chart.fallers.length} falls` : `${chart.fallers.length} falls this week`,
    chips: [`Prices in ${r.currency}`, "Real store prices"],
  });
}
