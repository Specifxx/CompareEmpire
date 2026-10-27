import { NextResponse } from "next/server";
import { z } from "zod";
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

// GET ?token=... — summarise what a token covers (price-drop AND restock alerts
// share one token namespace per email), for the unsubscribe page UI.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const [priceRows, restockRows] = await Promise.all([
    prisma.priceAlert.findMany({
      where: { unsubToken: token },
      select: { email: true, card: { select: { name: true, setCode: true } } },
    }),
    prisma.restockAlert.findMany({
      where: { unsubToken: token },
      select: { email: true, productSlug: true },
    }),
  ]);

  const total = priceRows.length + restockRows.length;
  if (total === 0) {
    // Already unsubscribed (or bad link) — not an error from the user's POV.
    return NextResponse.json({ active: false, count: 0 });
  }
  const email = priceRows[0]?.email ?? restockRows[0]!.email;
  return NextResponse.json({
    active: true,
    email: maskEmail(email),
    count: total,
    cards: priceRows.map((r) => ({ name: r.card.name, setCode: r.card.setCode })).slice(0, 100),
    restockProducts: restockRows.map((r) => r.productSlug).slice(0, 50),
  });
}

const schema = z.object({ token: z.string().min(1) });

// POST { token } — remove EVERY alert (price-drop + restock) for that token's email.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const [price, restock] = await Promise.all([
    prisma.priceAlert.deleteMany({ where: { unsubToken: parsed.data.token } }),
    prisma.restockAlert.deleteMany({ where: { unsubToken: parsed.data.token } }),
  ]);
  return NextResponse.json({ ok: true, removed: price.count + restock.count });
}
