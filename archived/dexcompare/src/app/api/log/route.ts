import { NextResponse } from "next/server";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Lightweight client→server error sink. The error boundaries (error.tsx /
// global-error.tsx) render in the BROWSER, so their console output never reaches
// the Vercel function logs. This endpoint lets them report the Next error
// `digest` + context to the server so it lands in the logs (searchable), turning
// every future "Reference: <digest>" the user sees into a traceable log line.
// No PII, no DB write (so it can't add to the very egress problem it diagnoses).
export async function POST(req: Request) {
  const rl = rateLimit(`clientlog:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const body = (await req.json().catch(() => null)) as
    | { digest?: string; message?: string; path?: string }
    | null;
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  console.error(
    `[client-error] digest=${(body.digest ?? "none").slice(0, 40)} ` +
      `path=${(body.path ?? "?").slice(0, 200)} ` +
      `msg=${(body.message ?? "").slice(0, 300)}`
  );
  return NextResponse.json({ ok: true });
}
