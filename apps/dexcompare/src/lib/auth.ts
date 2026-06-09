// Minimal server-side auth for the marketplace admin / verified sellers.
// Password hashing with bcrypt; session is a signed JWT in an httpOnly cookie (jose).
// Rebuilt lean after the earlier account-system removal — there is no public sign-up;
// accounts (e.g. the "compareempire" admin/verified seller) are provisioned by
// scripts/setup-admin.ts.
import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const COOKIE = "ce_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
// AUTH_SECRET must be set in production (Vercel env). The fallback only exists so
// local/dev builds don't crash; sessions signed with it are not portable.
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-insecure-secret-change-me");

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  verifiedSeller: boolean;
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}
export function verifyPassword(plain: string, hash: string | null | undefined): boolean {
  if (!hash) return false;
  return bcrypt.compareSync(plain, hash);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret);
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function destroySession(): void {
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const uid = payload.uid as string | undefined;
    if (!uid) return null;
    const u = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, email: true, displayName: true, isAdmin: true, verifiedSeller: true },
    });
    return u ?? null;
  } catch {
    return null;
  }
}

// Look up an account by its login name (we use the email field as the username).
export async function findUserByLogin(login: string) {
  const v = login.trim().toLowerCase();
  return prisma.user.findFirst({
    where: { OR: [{ email: v }, { displayName: { equals: login.trim(), mode: "insensitive" } }] },
    select: { id: true, email: true, displayName: true, isAdmin: true, verifiedSeller: true, passwordHash: true },
  });
}
