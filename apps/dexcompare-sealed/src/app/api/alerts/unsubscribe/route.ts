import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

// POST: RFC 8058 one-click unsubscribe (mail clients), and the confirm button
// on /alerts/unsubscribe. Deletes every alert for the address.
export async function POST(req: Request) {
  const url = new URL(req.url);
  let token = url.searchParams.get("token");
  if (!token) {
    const form = await req.formData().catch(() => null);
    token = (form?.get("token") as string | null) ?? null;
  }
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });
  const { count } = await prisma.restockAlert.deleteMany({ where: { token } });
  if (req.headers.get("accept")?.includes("text/html")) {
    return NextResponse.redirect(`${SITE_URL}/alerts/unsubscribe?done=${count}`, 303);
  }
  return NextResponse.json({ ok: true, removed: count });
}

// GET never deletes (link scanners and previewers follow GETs): send people to the confirm page.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  return NextResponse.redirect(`${SITE_URL}/alerts/unsubscribe?token=${encodeURIComponent(token)}`, 302);
}
