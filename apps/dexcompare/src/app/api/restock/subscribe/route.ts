import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { sendRestockConfirmationEmail } from "@/lib/email";
import { getFeaturedRestock } from "@/lib/restocks";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  productSlug: z.string().min(1).max(80),
  market: z.enum(["AU", "US", "GB"]).default("AU"),
});

// Subscribe an email to a featured product's restock alert. No account needed —
// this powers the /restock/<slug> page. Idempotent: re-subscribing the same
// product/market is a harmless no-op.
export async function POST(req: Request) {
  const rl = rateLimit(`restock:sub:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { email, productSlug, market } = parsed.data;

  const product = getFeaturedRestock(productSlug);
  if (!product) return NextResponse.json({ error: "Unknown product" }, { status: 400 });

  // Per-email DB caps (the IP rate-limit is per serverless instance, not global).
  const ALERT_CAP_PER_EMAIL = 50; // plenty — there are only a handful of trackers
  const CONFIRM_THROTTLE_MS = 24 * 60 * 60 * 1000;

  const [existingTotal, newest] = await Promise.all([
    prisma.restockAlert.count({ where: { email } }),
    prisma.restockAlert.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
      select: { unsubToken: true, createdAt: true },
    }),
  ]);
  if (existingTotal >= ALERT_CAP_PER_EMAIL) {
    return NextResponse.json({ error: "This email already has the maximum number of alerts." }, { status: 429 });
  }

  const unsubToken = newest?.unsubToken ?? randomUUID();

  // Upsert so a repeat subscribe is a no-op (and re-arms notifiedAt=null so the
  // subscriber gets the NEXT restock if they re-subscribe after one fired).
  const before = await prisma.restockAlert.findUnique({
    where: { email_productSlug_market: { email, productSlug, market } },
    select: { id: true },
  });
  await prisma.restockAlert.upsert({
    where: { email_productSlug_market: { email, productSlug, market } },
    update: {}, // already watching — don't reset notifiedAt or token
    create: { email, productSlug, market, unsubToken, notifiedAt: null },
  });
  const added = before == null;

  // Confirmation email — only on a NEW subscription and at most once per address
  // per 24h (stops the endpoint being used to repeatedly email an arbitrary address).
  const recentlyConfirmed = newest != null && Date.now() - newest.createdAt.getTime() < CONFIRM_THROTTLE_MS;
  if (added && !recentlyConfirmed) {
    const trackerUrl = `${SITE_URL}/restock/${productSlug}`;
    const unsubUrl = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
    void sendRestockConfirmationEmail(email, product.shortName, trackerUrl, unsubUrl);
  }

  return NextResponse.json({ ok: true, added });
}
