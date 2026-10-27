import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { computePortfolioSeries } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

const schema = z.object({
  // The cards + quantities the visitor owns — held only in their browser and sent
  // up just to compute the chart. Capped so one request stays cheap.
  holdings: z
    .array(z.object({ cardId: z.string().min(1).max(64), qty: z.number().int().positive().max(9999) }))
    .min(1)
    .max(500),
  market: z.enum(["AU", "NZ", "US", "GB"]).default("AU"),
  windowDays: z.number().int().min(7).max(365).default(90),
});

// Portfolio value-over-time. Takes the visitor's holdings and returns the summed
// daily value for their market, built from our per-card price snapshots. No
// account, no stored identifiers — the holdings are not persisted.
export async function POST(req: Request) {
  const rl = rateLimit(`pf:hist:${clientIp(req)}`, 60, 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { holdings, market, windowDays } = parsed.data;
  const points = await computePortfolioSeries(holdings, market, windowDays);
  return NextResponse.json({ points }, { headers: { "Cache-Control": "private, no-store" } });
}
