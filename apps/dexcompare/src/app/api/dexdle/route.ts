import { NextResponse } from "next/server";
import { z } from "zod";
import {
  dexdleDay,
  getDailyCard,
  getSeededCard,
  resolveGuess,
  compareGuess,
  getPoolNames,
  hintsFor,
  DEXDLE_ATTEMPTS,
} from "@/lib/dexdle";

export const dynamic = "force-dynamic";

function newSeed(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// GET → puzzle meta + autocomplete names.
//   ?mode=daily (default)      → { day, attempts, names }
//   ?mode=unlimited&new=1      → { seed, attempts, names }
//   ?reveal=1[&mode=&seed=]    → the answer (after the player runs out — honor
//                                system, it's a casual game, same as Riftle).
export async function GET(req: Request) {
  try {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "unlimited" ? "unlimited" : "daily";
  const seed = url.searchParams.get("seed") ?? "";

  if (url.searchParams.get("reveal") === "1") {
    const card = mode === "unlimited" ? await getSeededCard(seed) : await getDailyCard();
    return NextResponse.json({ card });
  }

  const names = await getPoolNames();
  if (mode === "unlimited") {
    return NextResponse.json({ seed: newSeed(), attempts: DEXDLE_ATTEMPTS, names });
  }
  return NextResponse.json(
    { day: dexdleDay(), attempts: DEXDLE_ATTEMPTS, names },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } }
  );
  } catch (e) {
    console.error("dexdle GET failed:", e);
    return NextResponse.json({ error: "Temporarily unavailable — try again shortly." }, { status: 500 });
  }
}

const schema = z.object({
  name: z.string().min(1).max(80),
  mode: z.enum(["daily", "unlimited"]).default("daily"),
  seed: z.string().max(40).optional(),
  guessNum: z.number().int().min(1).max(DEXDLE_ATTEMPTS).optional(),
});

// POST a guess → per-attribute feedback, progressive hints, and the full card
// once solved.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid guess" }, { status: 400 });
  const { name, mode, seed, guessNum } = parsed.data;

  const guess = await resolveGuess(name);
  if (!guess) return NextResponse.json({ error: "Card not found — pick a name from the suggestions." }, { status: 404 });

  const answer = mode === "unlimited" ? await getSeededCard(seed ?? "") : await getDailyCard();
  if (!answer) return NextResponse.json({ error: "No puzzle available" }, { status: 503 });

  const feedback = compareGuess(guess, answer);
  return NextResponse.json({
    feedback,
    hints: feedback.correct ? {} : hintsFor(answer, guessNum ?? 0),
    ...(feedback.correct ? { card: answer } : {}),
  });
}
