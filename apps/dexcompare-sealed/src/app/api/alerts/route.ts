import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { escapeHtml, layout, oneClickUnsubscribeUrl, send, unsubscribeUrl } from "@/lib/email";
import { regionOfMarket } from "@/lib/regions";
import { allow, clientIp } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const MAX_PER_EMAIL = 100;

export async function POST(req: Request) {
  if (!allow(`alert:${clientIp(req)}`, 8, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests — try again in a few minutes." }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as { email?: string; productId?: string; market?: string; website?: string } | null;
  if (!body) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  // Honeypot filled in: a bot. Pretend it worked.
  if (body.website) return NextResponse.json({ ok: true });

  const email = (body.email ?? "").trim().toLowerCase();
  const region = regionOfMarket(body.market ?? "");
  if (!EMAIL.test(email)) return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400 });
  if (!region || typeof body.productId !== "string") return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: body.productId }, select: { id: true, name: true, slug: true } });
  if (!product) return NextResponse.json({ error: "That product no longer exists." }, { status: 404 });

  const existing = await prisma.restockAlert.findMany({ where: { email }, select: { productId: true, market: true, token: true }, take: MAX_PER_EMAIL + 1 });
  if (existing.some((a) => a.productId === product.id && a.market === region.market)) return NextResponse.json({ ok: true, already: true });
  if (existing.length >= MAX_PER_EMAIL) return NextResponse.json({ error: "That address is already watching the maximum number of products." }, { status: 400 });

  // One token per address, shared by all its alerts: one unsubscribe link clears everything.
  const token = existing[0]?.token ?? randomBytes(24).toString("base64url");
  const stat = await prisma.productStat.findUnique({
    where: { productId_market: { productId: product.id, market: region.market } },
    select: { inStockStores: true },
  });
  const inStockNow = (stat?.inStockStores ?? 0) > 0;
  await prisma.restockAlert.create({
    // In stock right now: they can see that, so the first email waits for the
    // next sell-out → restock cycle instead of arriving tonight.
    data: { email, productId: product.id, market: region.market, token, notifiedAt: inStockNow ? new Date() : null },
  });

  // Confirmation only for an address's FIRST alert, so the form can't be used
  // to send a stranger one email per product.
  if (!existing.length) {
    const url = `${SITE_URL}/${region.region}/p/${product.slug}`;
    await send({
      to: email,
      subject: `Restock alert set: ${product.name}`,
      html: layout(
        "Your restock alert is set",
        `<p style="margin:0 0 14px;line-height:1.5">We'll email you when <a href="${url}" style="color:#15171c;font-weight:700">${escapeHtml(product.name)}</a> is in stock at a ${escapeHtml(region.name)} store we track.</p>
<p style="margin:0 0 14px;line-height:1.5;color:#6b6f7a;font-size:14px">Didn't ask for this? Use the unsubscribe link below and you won't hear from us again.</p>`,
        token,
      ),
      text: `We'll email you when ${product.name} is in stock in ${region.name}: ${url}\n\nNot you? Unsubscribe: ${unsubscribeUrl(token)}`,
      unsubscribeUrl: oneClickUnsubscribeUrl(token),
    });
  }
  return NextResponse.json({ ok: true, inStockNow });
}
