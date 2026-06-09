import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserByLogin, verifyPassword, createSession } from "@/lib/auth";

const schema = z.object({ username: z.string().min(1), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const user = await findUserByLogin(parsed.data.username);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true, isAdmin: user.isAdmin, verifiedSeller: user.verifiedSeller });
}
