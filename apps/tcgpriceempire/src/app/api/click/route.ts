import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isGameKey } from "@/lib/games";

// Outbound-click beacon (sendBeacon from OutboundLink). Fire-and-forget — never
// let analytics failures affect the visitor's click.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const retailer = String(body?.retailer ?? "").slice(0, 60);
    if (!retailer) return NextResponse.json({ ok: false }, { status: 400 });
    const game = isGameKey(String(body?.game ?? "")) ? String(body.game) : "";
    const kind = String(body?.kind ?? "single").slice(0, 20);
    await prisma.clickEvent.create({ data: { retailer, game, kind } });
  } catch {
    /* malformed beacon / DB hiccup — ignore */
  }
  return NextResponse.json({ ok: true });
}
