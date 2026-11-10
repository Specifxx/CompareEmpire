import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Empty, Section } from "@/components/Section";
import { StockRow } from "@/components/StockRow";
import type { ProductCardData } from "@/lib/data";
import { money } from "@/lib/format";
import type { RegionInfo } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { itemListJsonLd, jsonLd } from "@/lib/seo";
import { CHART_MIN_PCT, rankMove, type ChartRow, type WeeklyChart } from "@/lib/weekly-chart";

// One week's chart (lib/weekly-chart.ts), drawn by /<region>/charts/<week> and, for the latest week, /<region>/charts.
export function WeeklyChartView({ r, chart, cards, weeks }: { r: RegionInfo; chart: WeeklyChart; cards: Map<string, ProductCardData>; weeks: string[] }) {
  const path = `/${r.region}/charts/${chart.week}`;
  const rows = (list: ChartRow[]) => list.map((row) => ({ row, card: cards.get(row.slug) })).filter((x): x is { row: ChartRow; card: ProductCardData } => !!x.card);
  const up = rows(chart.risers);
  const down = rows(chart.fallers);
  const ld = itemListJsonLd({ name: `Magic sealed weekly price chart, week to ${formatRelease(chart.week)}, ${r.name}`, path, items: up.map(({ card }) => ({ path: `/${r.region}/p/${card.slug}`, name: card.name, image: card.imageUrl })) });
  const i = weeks.indexOf(chart.week);
  const newer = i > 0 ? weeks[i - 1] : null;
  const older = i >= 0 && i + 1 < weeks.length ? weeks[i + 1] : null;
  const list = (items: typeof up, dir: "up" | "down") => (
    <ol className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-[repeat(2,minmax(0,1fr))]">
      {items.map(({ card, row }) => (
        <li key={card.slug} className="flex items-stretch gap-2">
          <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-surface text-center">
            <span className="font-display text-lg font-bold tabular">#{row.rank}</span>
            {dir === "up" && <span className="text-[10px] font-semibold text-muted">{rankMove(row)}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <StockRow
              p={card}
              r={r}
              extra={
                <span className={`tabular text-[11px] font-semibold ${row.pct > 0 ? "text-sold" : "text-open"}`}>
                  {row.pct > 0 ? "▲" : "▼"} {Math.abs(row.pct)}% · {money(row.before, r.market)} → {money(row.after, r.market)}
                </span>
              }
            />
          </div>
        </li>
      ))}
    </ol>
  );
  return (
    <div className="page py-8">
      <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, { href: `/${r.region}/charts`, label: "Weekly chart" }, { label: formatRelease(chart.week) }]} />
      <header className="max-w-3xl">
        <div className="eyebrow">Weekly chart · {r.name}</div>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Magic sealed price chart: week to {formatRelease(chart.week)}
        </h1>
        <p className="mt-3 leading-7 text-muted">
          The sealed products whose cheapest in-stock price at {r.adjective} stores rose most from {formatRelease(chart.from)} to {formatRelease(chart.week)}, ranked, with
          each one&rsquo;s place on last week&rsquo;s chart, then the biggest falls. A product counts when two or more stores had it in stock on both days and its price moved{" "}
          {CHART_MIN_PCT}% or more; {chart.compared} products qualified. This is what the shelves did that week, not a forecast.
        </p>
      </header>
      <Section id="up" title="Top risers" kicker={`Week to ${formatRelease(chart.week)}`}>
        {up.length ? list(up, "up") : <Empty actions={[{ href: `/${r.region}/deals`, label: "Deals today" }]}>No product rose {CHART_MIN_PCT}% or more this week in {r.inName}.</Empty>}
      </Section>
      <Section id="down" title="Biggest falls" kicker="Cheaper than a week before">
        {down.length ? list(down, "down") : <Empty actions={[{ href: `/${r.region}/deals`, label: "Deals today" }]}>No product fell {CHART_MIN_PCT}% or more this week in {r.inName}.</Empty>}
      </Section>
      <nav className="mt-10 flex flex-wrap gap-2 text-sm" aria-label="Other weeks">
        {newer && (
          <Link href={`/${r.region}/charts/${newer}`} prefetch={false} className="chip py-2">
            ← Week to {formatRelease(newer)}
          </Link>
        )}
        {older && (
          <Link href={`/${r.region}/charts/${older}`} prefetch={false} className="chip py-2">
            Week to {formatRelease(older)} →
          </Link>
        )}
        <Link href={`/${r.region}/price-moves`} prefetch={false} className="chip py-2">
          Price moves today
        </Link>
      </nav>
      <p className="mt-6 max-w-3xl text-sm text-muted">Prices exclude shipping. One store listing or selling out can move the cheapest price, so a single week is a short window.</p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
    </div>
  );
}
