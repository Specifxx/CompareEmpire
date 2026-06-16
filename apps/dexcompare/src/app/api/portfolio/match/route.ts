import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  // Imported rows identified by their printed set + collector number — the
  // reliable key. A row we can't match is simply omitted from the result and the
  // importer reports it, rather than guessing and adding the wrong card.
  rows: z
    .array(
      z.object({
        setCode: z.string().trim().min(1).max(20),
        collectorNumber: z.string().trim().min(1).max(20),
      })
    )
    .min(1)
    .max(500),
});

const keyOf = (setCode: string, num: string) => `${setCode.toUpperCase()}|${num.toUpperCase()}`;

// Resolve { setCode, collectorNumber } pairs from an imported CSV to our card ids.
// One bounded query over the referenced sets (slim select), matched in memory.
export async function POST(req: Request) {
  const rl = rateLimit(`pf:match:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { rows } = parsed.data;
  const setCodes = [...new Set(rows.map((r) => r.setCode.toUpperCase()))];
  const cards = await prisma.card.findMany({
    where: { setCode: { in: setCodes } },
    select: { id: true, setCode: true, collectorNumber: true },
    take: 5000,
  });

  const byKey = new Map(cards.map((c) => [keyOf(c.setCode, c.collectorNumber), c.id]));
  const matched: Record<string, string> = {}; // "SET|NUM" -> cardId
  for (const r of rows) {
    const id = byKey.get(keyOf(r.setCode, r.collectorNumber));
    if (id) matched[keyOf(r.setCode, r.collectorNumber)] = id;
  }

  return NextResponse.json({ matched }, { headers: { "Cache-Control": "private, no-store" } });
}
