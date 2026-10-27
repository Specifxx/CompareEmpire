import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Mask an email for display on the (public, token-addressed) unsubscribe page so
// the full address is never echoed back. e.g. "someone@gmail.com" → "so***@gmail.com".
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "your email";
  const head = local.slice(0, 2);
  return `${head}${local.length > 2 ? "***" : "*"}@${domain}`;
}

// A token identifies an EMAIL, not a single alert: resolve whichever row
// carries it, then operate on every alert for that address. One link in any
// email therefore silences everything — nobody should need N links to escape.
async function emailForToken(token: string): Promise<string | null> {
  const hit = await prisma.priceAlert.findFirst({ where: { unsubToken: token }, select: { email: true } });
  return hit?.email ?? null;
}

// GET ?token=... — summarise what a token covers, for the unsubscribe page UI.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const email = await emailForToken(token);
  if (!email) {
    // Already unsubscribed (or bad link) — not an error from the user's POV.
    return NextResponse.json({ active: false, count: 0 });
  }

  const [count, rows] = await Promise.all([
    prisma.priceAlert.count({ where: { email } }),
    prisma.priceAlert.findMany({
      where: { email },
      select: { card: { select: { name: true, setName: true } } },
      take: 100,
    }),
  ]);

  return NextResponse.json({
    active: true,
    email: maskEmail(email),
    count,
    cards: rows.map((r) => ({ name: r.card.name, setName: r.card.setName })),
  });
}

// POST { token } — remove EVERY price alert for that token's email.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const email = await emailForToken(token);
  if (!email) return NextResponse.json({ ok: true, removed: 0 });

  const result = await prisma.priceAlert.deleteMany({ where: { email } });
  return NextResponse.json({ ok: true, removed: result.count });
}
