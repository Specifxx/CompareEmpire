import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  cardId: z.string().min(1).max(40),
  rating: z.number().int().min(1).max(5),
  // Optional written content. Trimmed; empty strings collapse to undefined.
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z.string().trim().max(2000).optional().or(z.literal("")),
  author: z.string().trim().max(60).optional().or(z.literal("")),
});

// Submit a genuine card review (1–5 stars + optional text). No account needed.
// One review per IP per card so the rating stays honest, and the raw IP is never
// stored — only a salted-by-card hash used purely for that cap.
export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`review:${ip}`, 10, 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { cardId, rating } = parsed.data;
  const title = parsed.data.title || undefined;
  const body = parsed.data.body || undefined;
  const author = parsed.data.author || undefined;

  // Resolve slug OR cuid to the canonical card id, and confirm it exists.
  const card = await prisma.card.findFirst({
    where: { OR: [{ id: cardId }, { slug: cardId }] },
    select: { id: true },
  });
  if (!card) return NextResponse.json({ error: "Unknown card" }, { status: 400 });

  // Per-card IP hash — lets us enforce one review per card without keeping IPs.
  const ipHash = createHash("sha256").update(`${card.id}:${ip}`).digest("hex");

  const existing = await prisma.cardReview.findFirst({
    where: { cardId: card.id, ipHash },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "You've already reviewed this card." }, { status: 409 });
  }

  const review = await prisma.cardReview.create({
    data: { cardId: card.id, rating, title, body, author, ipHash },
    select: { id: true, rating: true, title: true, body: true, author: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, review });
}
