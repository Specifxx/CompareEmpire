import { prisma } from "./db";
import { sendPriceDropEmail } from "./email";
import { SITE_URL } from "./site";

export interface AlertRunSummary {
  checked: number; // alert rows examined
  emailsSent: number; // notifications delivered this run
  rearmed: number; // alerts reset because their condition stopped holding
}

// How far a target-less watch must fall week-on-week before we call it a drop.
// 5% keeps feed jitter (a few cents on a cheap card) out of inboxes.
const DROP_THRESHOLD_PCT = 5;

// Find each card's week-ago baseline from the daily PriceHistory snapshots:
// the recorded day closest to 7 days before the card's latest snapshot.
// Restricted to a 14-day window so a card with stale history (no recent
// snapshots) simply has no baseline rather than comparing against last month.
async function weekAgoBaselines(cardIds: string[]): Promise<Map<string, number>> {
  const baselines = new Map<string, number>();
  if (!cardIds.length) return baselines;

  const since = new Date(Date.now() - 14 * 86400_000);
  const rows = await prisma.priceHistory.findMany({
    where: { cardId: { in: cardIds }, day: { gte: since } },
    orderBy: { day: "asc" },
    select: { cardId: true, day: true, marketPriceCents: true },
  });

  const byCard = new Map<string, { day: Date; cents: number }[]>();
  for (const r of rows) {
    const list = byCard.get(r.cardId) ?? [];
    list.push({ day: r.day, cents: r.marketPriceCents });
    byCard.set(r.cardId, list);
  }

  for (const [cardId, points] of byCard) {
    // Day 1 of history: only one snapshot — no week-on-week signal yet.
    if (points.length < 2) continue;
    const last = points[points.length - 1];
    const target = last.day.getTime() - 7 * 86400_000;
    const base = points
      .slice(0, -1)
      .reduce((best, p) => (Math.abs(p.day.getTime() - target) < Math.abs(best.day.getTime() - target) ? p : best));
    if (base.cents > 0) baselines.set(cardId, base.cents);
  }
  return baselines;
}

// Walk every price alert and, per row, evaluate its trigger condition against
// the card's CURRENT market price:
//   • targetCents set  → trigger when marketPriceCents <= targetCents,
//   • targetCents null → trigger when the price fell >= 5% vs ~7 days ago.
//
// Pending subscribers (notifiedAt null) get ONE email per trigger; notifiedAt
// marks them done so a price that sits below the target doesn't email daily.
// When the condition stops holding (price rose back), the alert RE-ARMS
// (notifiedAt cleared) so the next genuine dip notifies again — the same
// proven semantics as dexcompare's alerts. Designed to run daily, right after
// the price importer refreshes market prices and snapshots.
export async function runPriceAlerts(): Promise<AlertRunSummary> {
  const alerts = await prisma.priceAlert.findMany({
    select: {
      id: true,
      email: true,
      targetCents: true,
      unsubToken: true,
      notifiedAt: true,
      card: { select: { id: true, name: true, slug: true, marketPriceCents: true } },
    },
  });

  const summary: AlertRunSummary = { checked: alerts.length, emailsSent: 0, rearmed: 0 };
  if (!alerts.length) return summary;

  // Week-ago baselines are only needed for target-less watches; one batched
  // history query covers every distinct card among them.
  const dropCardIds = Array.from(new Set(alerts.filter((a) => a.targetCents == null).map((a) => a.card.id)));
  const baselines = await weekAgoBaselines(dropCardIds);

  const notifiedIds: string[] = [];
  const rearmIds: string[] = [];

  for (const a of alerts) {
    const current = a.card.marketPriceCents;
    // No live price → nothing to compare; leave the alert exactly as it is.
    if (current == null) continue;

    let triggered: boolean;
    if (a.targetCents != null) {
      triggered = current <= a.targetCents;
    } else {
      const base = baselines.get(a.card.id);
      triggered = base != null && ((base - current) / base) * 100 >= DROP_THRESHOLD_PCT;
    }

    if (triggered && a.notifiedAt == null) {
      const cardUrl = `${SITE_URL}/card/${a.card.slug}`;
      const unsubUrl = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(a.unsubToken)}`;
      // Sequential sends stay gentle on the email provider's rate limits; the
      // daily volume is small. Only a SUCCESSFUL send marks the row notified,
      // so a transient failure is retried on the next run instead of lost.
      const sent = await sendPriceDropEmail(a.email, a.card.name, current, a.targetCents, cardUrl, unsubUrl);
      if (sent) {
        summary.emailsSent++;
        notifiedIds.push(a.id);
      }
    } else if (!triggered && a.notifiedAt != null) {
      rearmIds.push(a.id);
    }
  }

  if (notifiedIds.length) {
    await prisma.priceAlert.updateMany({ where: { id: { in: notifiedIds } }, data: { notifiedAt: new Date() } });
  }
  if (rearmIds.length) {
    await prisma.priceAlert.updateMany({ where: { id: { in: rearmIds } }, data: { notifiedAt: null } });
    summary.rearmed = rearmIds.length;
  }

  return summary;
}
