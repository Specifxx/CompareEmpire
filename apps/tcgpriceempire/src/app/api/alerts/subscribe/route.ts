import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { sendAlertConfirmationEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

// ── Per-email DB caps (ported from dexcompare's hardening). DB-enforced, so
// they hold even across serverless instances where in-memory limits don't. ──
const ALERT_CAP_PER_EMAIL = 200; // most cards a single address may ever watch
const CONFIRM_THROTTLE_MS = 24 * 60 * 60 * 1000; // ≤ 1 confirmation email / 24h

// Good-enough email shape check — deliverability is Resend's problem, this just
// rejects junk before it hits the DB.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Subscribe an email to a price alert for one card. No account required — this
// powers the card-page alert form. POST { email, cardId, targetCents? }:
// targetCents set = "tell me when it's at or below this"; absent = "tell me on
// any meaningful week-on-week drop".
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const cardId = typeof body?.cardId === "string" ? body.cardId : "";
  if (!email || email.length > 200 || !EMAIL_RE.test(email) || !cardId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  // Optional target, in integer cents. Bounded so nonsense values can't land.
  let targetCents: number | null = null;
  if (body?.targetCents != null) {
    const t = body.targetCents;
    if (typeof t !== "number" || !Number.isInteger(t) || t < 1 || t > 100_000_000) {
      return NextResponse.json({ error: "Invalid target price" }, { status: 400 });
    }
    targetCents = t;
  }

  // Only watch cards that actually exist (the name also feeds the confirmation).
  const card = await prisma.card.findUnique({ where: { id: cardId }, select: { id: true, name: true } });
  if (!card) {
    return NextResponse.json({ error: "No matching card" }, { status: 400 });
  }

  // Existing footprint for this email: total rows (for the cap), the newest
  // row's time (to throttle confirmations), its shared unsubscribe token, and
  // whether THIS card is already watched (updates bypass the cap — no growth).
  const [existingTotal, newest, existing] = await Promise.all([
    prisma.priceAlert.count({ where: { email } }),
    prisma.priceAlert.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
      select: { unsubToken: true, createdAt: true },
    }),
    prisma.priceAlert.findUnique({
      where: { email_cardId: { email, cardId } },
      select: { id: true },
    }),
  ]);

  if (!existing && existingTotal >= ALERT_CAP_PER_EMAIL) {
    // At the cap — updating an existing watch is fine, but reject net-new rows
    // to stop unbounded growth on one address.
    return NextResponse.json(
      { error: "This email is already watching the maximum number of cards." },
      { status: 429 }
    );
  }

  // Reuse this email's existing unsubscribe token so one link covers every card.
  const unsubToken = newest?.unsubToken ?? randomUUID();

  await prisma.priceAlert.upsert({
    where: { email_cardId: { email, cardId } },
    // Re-subscribing updates the target AND re-arms the alert, so a new
    // threshold can fire even if the old one already notified.
    update: { targetCents, notifiedAt: null },
    create: { email, cardId, targetCents, unsubToken },
  });

  // Confirmation email — only when this request added a NEW watch AND this
  // address hasn't been sent one within the throttle window. This stops the
  // endpoint from being used to repeatedly email an arbitrary address.
  const recentlyConfirmed = newest != null && Date.now() - newest.createdAt.getTime() < CONFIRM_THROTTLE_MS;
  if (!existing && !recentlyConfirmed) {
    const unsubUrl = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
    // Best-effort: don't block (or fail) the response on the network round-trip.
    void sendAlertConfirmationEmail(email, card.name, unsubUrl);
  }

  return NextResponse.json({ ok: true, watching: existingTotal + (existing ? 0 : 1) });
}
