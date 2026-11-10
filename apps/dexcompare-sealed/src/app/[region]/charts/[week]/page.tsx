import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WeeklyChartView } from "@/components/WeeklyChartView";
import { cardsFor } from "@/content/guides/data";
import { detailIndexed } from "@/lib/index-tiers";
import { readPriceHistory } from "@/lib/price-history";
import { regionOrNotFound } from "@/lib/regions";
import { formatRelease } from "@/lib/release";
import { ogCardImage, pageMeta, regionAlternates } from "@/lib/seo";
import { publishedWeeks, weeklyChart } from "@/lib/weekly-chart";

// /<region>/charts/<week>: one week's sealed price chart (lib/weekly-chart.ts, X3 2026-11-10). A permanent, dated URL: the page is drawn
// from the price history alone, so it shows the same chart for as long as the history keeps that week. A week that did not publish
// (too few real moves) is a 404. Rendered per request and kept by Vercel's CDN for a day (next.config.js CDN_PAGES), never ISR.
export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { region: string; week: string } }): Metadata {
  const r = regionOrNotFound(params.region);
  const chart = weeklyChart(readPriceHistory(), r.market, params.week);
  if (!chart?.published) return {};
  const title = `Magic sealed price chart, week to ${formatRelease(chart.week)} (${r.short})`;
  const top = chart.risers[0];
  const meta = pageMeta({
    title,
    description: `The sealed Magic products whose cheapest price at ${r.adjective} stores rose most in the week to ${formatRelease(chart.week)}${top ? `, led by a ${top.pct}% rise` : ""}, ranked with last week's places, plus the biggest falls.`.slice(0, 160),
    path: `/${r.region}/charts/${chart.week}`,
    alternates: detailIndexed(r.region) ? regionAlternates(r.region, `/charts/${chart.week}`) : undefined,
    noindex: !detailIndexed(r.region),
  });
  return { ...meta, openGraph: { ...meta.openGraph, images: [ogCardImage(`/og/charts/${r.region}/${chart.week}`, title)] } };
}

export default async function WeeklyChartPage({ params }: { params: { region: string; week: string } }) {
  const r = regionOrNotFound(params.region);
  const h = readPriceHistory();
  const chart = weeklyChart(h, r.market, params.week);
  if (!chart?.published) notFound();
  const cards = await cardsFor(r.market, [...chart.risers, ...chart.fallers].map((x) => x.slug));
  return <WeeklyChartView r={r} chart={chart} cards={new Map(cards.map((c) => [c.slug, c]))} weeks={publishedWeeks(h, r.market)} />;
}
