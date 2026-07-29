import { randomUUID } from "crypto";
import { prisma } from "./db";
import { getTopDeals, type Deal } from "./deals";
import { readIndexSeries, computeIndexStats } from "./market-index";
import { sendNewsletterDigestEmail, isEmailEnabled } from "./email";
import { formatMoney } from "./format";
import { currencyOf, normalizeCountry, COUNTRIES, type Country } from "./country";
import { cardHref } from "./card-url";
import { SITE_URL } from "./site";

export interface NewsletterRunSummary {
  edition: string; // e.g. "2026-W24"
  subscribers: number; // total rows in the list
  due: number; // not yet sent this edition
  emails: number; // successfully delivered this run
  quietMarkets: string[]; // markets skipped for lack of deals
}

// ISO-8601 week key — one digest edition per calendar week, so reruns of the
// cron (or a manual trigger after a partial failure) never double-send.
export function editionKey(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // nearest Thursday decides the ISO year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const utm = (path: string) => `${SITE_URL}${path}?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-digest`;

// One card row in a digest section. Same visual language as the price-drop
// alert rows so the two emails read as one product.
function dealRow(d: Deal, currency: string): string {
  return `<tr><td style="padding:10px 0;border-bottom:1px solid #233047">
    <a href="${utm(cardHref(d.card))}" style="color:#fff;font-weight:700;text-decoration:none;font-size:15px">${d.card.name}</a>
    <div style="font-size:12px;color:#6b7585;margin-top:2px">${d.card.setCode} · ${d.card.collectorNumber}</div>
    <div style="margin-top:4px;font-size:14px;color:#b8c0cc">${formatMoney(d.priceCents, currency)}
      &nbsp;<span style="color:#34d17e;font-weight:700">${d.pct}% off guide</span></div>
  </td></tr>`;
}

function section(title: string, items: Deal[], currency: string, take: number): string {
  if (!items.length) return "";
  return `<tr><td style="padding:14px 32px 0;font-size:13px;font-weight:700;color:#34d17e">${title}</td></tr>
    <tr><td style="padding:0 32px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items
      .slice(0, take)
      .map((d) => dealRow(d, currency))
      .join("")}</table></td></tr>`;
}

interface Digest {
  subject: string;
  heading: string;
  inner: string;
}

// The footer signs subscribers up for "the weekly Index summary" — this is
// that summary, built from the same bounded IndexSnapshot rows the /market
// page reads. Returns "" (not null) on no data yet, since the deals section
// alone is still a valid digest.
function indexBlurb(stats: ReturnType<typeof computeIndexStats>): string {
  if (!stats.latest) return "";
  const changeStr = stats.changePct != null ? `${stats.changePct >= 0 ? "+" : ""}${stats.changePct.toFixed(1)}%` : null;
  const color = stats.changePct != null && stats.changePct >= 0 ? "#34d17e" : "#f87171";
  return `
    <tr><td style="padding:14px 32px 0;font-size:13px;font-weight:700;color:#34d17e">📈 DexCompare Index</td></tr>
    <tr><td style="padding:6px 32px 0;font-size:14px;line-height:1.6;color:#b8c0cc">
      The Index is at <strong style="color:#fff">${stats.latest.value.toFixed(1)}</strong>${
        changeStr ? ` (<span style="color:${color};font-weight:700">${changeStr}</span> since tracking began)` : ""
      } — a search-weighted basket of the ${stats.latest ? "" : ""}Pokémon cards collectors are watching most.
      <a href="${utm("/market")}" style="color:#34d17e;font-weight:700;text-decoration:none">See the full breakdown →</a>
    </td></tr>`;
}

// Build one market's digest, or null on a quiet week (house rule: skip rather
// than send noise).
function buildDigest(deals: Deal[], market: Country, indexHtml: string): Digest | null {
  if (!deals.length && !indexHtml) return null;

  const info = COUNTRIES[market];
  const currency = currencyOf(market);
  const subject = deals[0]
    ? `📊 Pokémon TCG deal of the week: ${deals[0].card.name} — ${deals[0].pct}% off guide`
    : "📊 Your weekly Pokémon TCG Index & deals digest";

  const inner = `
    <tr><td style="padding:8px 32px 0;font-size:14px;line-height:1.6;color:#b8c0cc">
      This week's biggest gaps between live lowest in-stock prices and the TCGplayer market guide, across ${info.adjective} stores.
    </td></tr>
    ${section("💰 Best deals this week", deals, currency, 8)}
    ${indexHtml}
    <tr><td style="padding:18px 32px 24px"><a href="${utm("/deals")}" style="display:inline-block;background:#34d17e;color:#06210f;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px">See all deals</a></td></tr>`;

  return { subject, heading: "This week's best Pokémon TCG deals", inner };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Weekly digest send. Walks every subscriber who hasn't received this week's
// edition, builds one digest per market (subscribers chose their market at
// signup), and emails them with a per-subscriber unsubscribe link. Marks each
// row only after a successful send, so a crash mid-run resumes cleanly.
export async function runNewsletterDigest(): Promise<NewsletterRunSummary> {
  const edition = editionKey();
  const subs = await prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "asc" } });
  const due = subs.filter((s) => s.lastEditionKey !== edition);
  const summary: NewsletterRunSummary = {
    edition,
    subscribers: subs.length,
    due: due.length,
    emails: 0,
    quietMarkets: [],
  };
  if (!due.length || !isEmailEnabled()) return summary;

  // Computed ONCE for the whole run (global, market-neutral) — not per
  // subscriber market. Reads only the bounded IndexSnapshot rows.
  const globalIndexHtml = indexBlurb(computeIndexStats(await readIndexSeries("GLOBAL", 730)));

  // One digest per market, computed once and reused for every subscriber in it.
  const digests = new Map<Country, Digest | null>();
  for (const sub of due) {
    const market = normalizeCountry(sub.market);
    if (!digests.has(market)) {
      const deals = await getTopDeals(12, market);
      digests.set(market, buildDigest(deals, market, globalIndexHtml));
      if (!digests.get(market)) summary.quietMarkets.push(market);
    }
    const digest = digests.get(market);
    if (!digest) continue; // quiet week in this market — try again next edition

    // Lazy-backfill the unsubscribe token for rows created before it existed.
    const token = sub.unsubToken ?? randomUUID();
    if (!sub.unsubToken) {
      await prisma.newsletterSubscriber.update({ where: { id: sub.id }, data: { unsubToken: token } });
    }
    const unsubUrl = `${SITE_URL}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
    const sent = await sendNewsletterDigestEmail(sub.email, digest.subject, digest.heading, digest.inner, unsubUrl);
    if (sent) {
      summary.emails++;
      await prisma.newsletterSubscriber.update({ where: { id: sub.id }, data: { lastEditionKey: edition } });
    }
    await sleep(600); // stay under Resend's 2 req/s rate limit
  }
  return summary;
}
