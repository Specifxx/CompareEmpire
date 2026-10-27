import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { pickPrice, type Country } from "@/lib/country";
import { sendAlertConfirmationEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  // The card ids to watch (the user's wishlist). Capped to keep one request cheap.
  cardIds: z.array(z.string().min(1)).min(1).max(500),
  market: z.enum(["AU", "NZ", "US", "GB"]).default("AU"),
});

// Subscribe an email to price-drop alerts for a set of wishlisted cards. No account
// required — this powers the wishlist pop-up. Idempotent: re-subscribing the same
// card is a no-op (we never reset an existing baseline), so repeat hearts are safe.
export async function POST(req: Request) {
  // Limit how fast a single IP can create subscriptions (anti email-bombing).
  const rl = rateLimit(`alerts:sub:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { email, cardIds, market } = parsed.data;

  // ── Per-email DB caps (the IP rate-limit above is per serverless instance, so
  // it isn't a hard global limit). These bound abuse of an arbitrary address. ──
  const ALERT_CAP_PER_EMAIL = 500; // most a single address may ever watch
  const CONFIRM_THROTTLE_MS = 24 * 60 * 60 * 1000; // ≤ 1 confirmation email / 24h

  // Existing footprint for this email: total rows (for the cap), the newest row's
  // time (to throttle confirmations), and the shared unsubscribe token.
  const [existingTotal, newest] = await Promise.all([
    prisma.priceAlert.count({ where: { email } }),
    prisma.priceAlert.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
      select: { unsubToken: true, createdAt: true },
    }),
  ]);

  if (existingTotal >= ALERT_CAP_PER_EMAIL) {
    // Already at the cap — re-subscribing existing cards is fine (no growth), but
    // reject net-new to stop unbounded growth on one address.
    return NextResponse.json(
      { error: "This email is already watching the maximum number of cards." },
      { status: 429 }
    );
  }

  // Only watch cards that actually exist; capture today's lowest price as the
  // baseline so we alert on FUTURE drops, not on the price they're already at.
  // Bound how many NEW rows this email can gain so it never exceeds the cap.
  const room = ALERT_CAP_PER_EMAIL - existingTotal;
  const cards = await prisma.card.findMany({
    where: { id: { in: Array.from(new Set(cardIds)) } },
    select: {
      id: true,
      lowestPriceCents: true,
      lowestPriceCentsNz: true,
      lowestPriceCentsUs: true,
      lowestPriceCentsGb: true,
    },
    take: room,
  });
  if (cards.length === 0) {
    return NextResponse.json({ error: "No matching cards" }, { status: 400 });
  }

  // Reuse this email's existing unsubscribe token so one link covers every card.
  const unsubToken = newest?.unsubToken ?? randomUUID();

  // createMany + skipDuplicates means re-subscribing an already-watched card is a
  // harmless no-op and never clobbers its tracked baseline.
  const result = await prisma.priceAlert.createMany({
    data: cards.map((c) => ({
      email,
      cardId: c.id,
      market,
      unsubToken,
      lastPriceCents: pickPrice(c, market as Country),
    })),
    skipDuplicates: true,
  });

  // Total cards this email now watches in this market (for the confirmation copy).
  const total = await prisma.priceAlert.count({ where: { email, market } });

  // Confirmation email — only when this request added a new watch AND this address
  // hasn't been sent a confirmation within the throttle window. This stops the
  // endpoint from being used to repeatedly email an arbitrary address.
  const recentlyConfirmed =
    newest != null && Date.now() - newest.createdAt.getTime() < CONFIRM_THROTTLE_MS;
  if (result.count > 0 && !recentlyConfirmed) {
    const unsubUrl = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
    // Don't block the response on the network round-trip.
    void sendAlertConfirmationEmail(email, total, unsubUrl);
  }

  return NextResponse.json({ ok: true, added: result.count, watching: total });
}
