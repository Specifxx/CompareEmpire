import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Empty } from "@/components/Section";
import { WeeklyChartView } from "@/components/WeeklyChartView";
import { cardsFor } from "@/content/guides/data";
import { detailIndexed } from "@/lib/index-tiers";
import { readPriceHistory } from "@/lib/price-history";
import { regionOrNotFound } from "@/lib/regions";
import { pageMeta, regionAlternates } from "@/lib/seo";
import { publishedWeeks, weeklyChart } from "@/lib/weekly-chart";

// /<region>/charts: the latest published weekly chart (lib/weekly-chart.ts), with links to every earlier week. Its canonical is the
// dated week page, so the two never compete. Rendered per request and kept by Vercel's CDN for a day, never ISR.
export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { region: string } }): Metadata {
  const r = regionOrNotFound(params.region);
  const latest = publishedWeeks(readPriceHistory(), r.market)[0];
  return pageMeta({
    title: `Magic sealed weekly price chart (${r.short})`,
    description: `Every week, the sealed Magic products whose cheapest price at ${r.adjective} stores rose and fell most, ranked, from MTG Compare's daily price snapshots.`,
    path: latest ? `/${r.region}/charts/${latest}` : `/${r.region}/charts`,
    alternates: !latest && detailIndexed(r.region) ? regionAlternates(r.region, "/charts") : undefined,
    noindex: !latest || !detailIndexed(r.region),
  });
}

export default async function ChartsPage({ params }: { params: { region: string } }) {
  const r = regionOrNotFound(params.region);
  const h = readPriceHistory();
  const weeks = publishedWeeks(h, r.market);
  const chart = weeks[0] ? weeklyChart(h, r.market, weeks[0]) : null;
  if (!chart) {
    return (
      <div className="page py-8">
        <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, { label: "Weekly chart" }]} />
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Magic sealed weekly price chart</h1>
        <div className="mt-8">
          <Empty actions={[{ href: `/${r.region}/price-moves`, label: "Price moves today" }]}>No week has enough real price moves in {r.inName} to chart yet.</Empty>
        </div>
      </div>
    );
  }
  const cards = await cardsFor(r.market, [...chart.risers, ...chart.fallers].map((x) => x.slug));
  return <WeeklyChartView r={r} chart={chart} cards={new Map(cards.map((c) => [c.slug, c]))} weeks={weeks} />;
}
