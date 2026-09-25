import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

// Called by scripts/import.ts after each import: every cached page re-renders
// from the fresh data on its next visit (and only then — nothing is rebuilt
// up front, so an import never costs more database reads than visits do).
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
