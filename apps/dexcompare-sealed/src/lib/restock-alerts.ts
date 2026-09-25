// Restock alerts, run at the end of every import.
//
// State, not history: an alert is "armed" (notifiedAt null) or "sent for the
// current in-stock window" (notifiedAt set). A product that is in stock in the
// alert's market emails its armed subscribers and disarms them; a product sold
// out everywhere in that market re-arms them for the next restock.
import { prisma } from "./db";
import { emailEnabled, escapeHtml, layout, oneClickUnsubscribeUrl, send, unsubscribeUrl } from "./email";
import { money } from "./format";
import { regionOfMarket } from "./regions";
import { SITE_URL } from "./site";

export async function runRestockAlerts(): Promise<{ emailed: number; alerts: number; rearmed: number; skipped: string | null }> {
  const alerts = await prisma.restockAlert.findMany({
    select: { id: true, email: true, productId: true, market: true, token: true, notifiedAt: true },
  });
  if (!alerts.length) return { emailed: 0, alerts: 0, rearmed: 0, skipped: null };

  const stats = await prisma.productStat.findMany({
    where: { productId: { in: [...new Set(alerts.map((a) => a.productId))] } },
    select: { productId: true, market: true, lowestPriceCents: true, inStockStores: true },
  });
  const statOf = new Map(stats.map((s) => [`${s.productId}|${s.market}`, s]));
  const isOpen = (a: { productId: string; market: string }) => (statOf.get(`${a.productId}|${a.market}`)?.inStockStores ?? 0) > 0;

  // Re-arm first: it needs no email and must happen even when email is off.
  const rearm = alerts.filter((a) => a.notifiedAt && !isOpen(a)).map((a) => a.id);
  if (rearm.length) await prisma.restockAlert.updateMany({ where: { id: { in: rearm } }, data: { notifiedAt: null } });

  const due = alerts.filter((a) => !a.notifiedAt && isOpen(a));
  if (!due.length) return { emailed: 0, alerts: 0, rearmed: rearm.length, skipped: null };
  if (!emailEnabled()) return { emailed: 0, alerts: 0, rearmed: rearm.length, skipped: `${due.length} alerts due but RESEND_API_KEY is not set` };

  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set(due.map((a) => a.productId))] } },
    select: { id: true, name: true, slug: true, imageUrl: true },
  });
  const productOf = new Map(products.map((p) => [p.id, p]));

  const byEmail = new Map<string, typeof due>();
  for (const a of due) (byEmail.get(a.email) ?? byEmail.set(a.email, []).get(a.email)!).push(a);

  let emailed = 0;
  let sentAlerts = 0;
  for (const [email, list] of byEmail) {
    const items = list
      .map((a) => {
        const p = productOf.get(a.productId);
        const s = statOf.get(`${a.productId}|${a.market}`);
        const region = regionOfMarket(a.market);
        if (!p || !s || !region) return null;
        const url = `${SITE_URL}/${region.region}/p/${p.slug}`;
        const price = money(s.lowestPriceCents, a.market);
        const stores = `${s.inStockStores} ${s.inStockStores === 1 ? "store" : "stores"}`;
        return {
          html: `<p style="margin:0 0 14px"><a href="${url}" style="color:#15171c;font-weight:700;text-decoration:none">${escapeHtml(p.name)}</a><br>
<span style="color:#1a7f37;font-weight:600">In stock at ${stores}</span> · from <b>${price}</b> ${region.flag}<br>
<a href="${url}" style="color:#e3350d;font-size:14px">Compare stores →</a></p>`,
          text: `${p.name} — in stock at ${stores}, from ${price}: ${url}`,
          name: p.name,
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    if (!items.length) continue;
    const token = list[0].token;
    const subject = items.length === 1 ? `Back in stock: ${items[0].name}` : `${items.length} products you're watching are back in stock`;
    const ok = await send({
      to: email,
      subject,
      html: layout(items.length === 1 ? "It's back in stock" : "They're back in stock", items.map((i) => i.html).join(""), token),
      text: `${items.map((i) => i.text).join("\n")}\n\nUnsubscribe: ${unsubscribeUrl(token)}`,
      unsubscribeUrl: oneClickUnsubscribeUrl(token),
    });
    if (!ok) continue;
    await prisma.restockAlert.updateMany({ where: { id: { in: list.map((a) => a.id) } }, data: { notifiedAt: new Date() } });
    emailed++;
    sentAlerts += list.length;
  }
  return { emailed, alerts: sentAlerts, rearmed: rearm.length, skipped: null };
}
