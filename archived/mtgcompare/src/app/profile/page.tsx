import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SITE_NAME } from "@/lib/site";
import { formatMoney } from "@/lib/format";
import { conditionInfo } from "@/lib/constants";
import {
  LogoutButton,
  ResendVerifyButton,
  TopUpButton,
  CancelListingButton,
} from "@/components/ProfileActions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  const [account, listings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        googleId: true,
        discordId: true,
        passwordHash: true,
        balanceCents: true,
        verifiedSeller: true,
      },
    }),
    prisma.listing.findMany({
      where: { sellerId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        condition: true,
        isFoil: true,
        priceCents: true,
        quantity: true,
        currency: true,
        card: { select: { id: true, slug: true, name: true, collectorNumber: true } },
      },
    }),
  ]);

  const methods = [
    { label: "Password", on: !!account?.passwordHash },
    { label: "Google", on: !!account?.googleId },
    { label: "Discord", on: !!account?.discordId },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="card-surface flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-500 text-2xl font-black text-white">
              {user.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-extrabold text-white">{user.displayName}</h1>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>
        </div>
        <LogoutButton />
      </div>

      {/* Account & security */}
      <div className="card-surface mt-5 p-5">
        <h2 className="font-bold text-white">Account &amp; security</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-ink-800 pb-3 text-sm">
          <span className="text-slate-400">Email</span>
          {user.emailVerified ? (
            <span className="chip bg-brand-500/15 text-brand-400">✓ Verified</span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="chip bg-gold/15 text-gold">Not confirmed</span>
              <ResendVerifyButton />
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-slate-400">Sign-in methods</span>
          <span className="flex gap-1.5">
            {methods.map((m) => (
              <span key={m.label} className={`chip ${m.on ? "bg-ink-800 text-slate-200" : "bg-ink-900 text-slate-600"}`}>
                {m.on ? "✓ " : ""}{m.label}
              </span>
            ))}
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Link more sign-in options any time from the <Link href="/login" className="text-brand-400 hover:underline">sign-in page</Link>, or manage your{" "}
          <Link href="/wishlist" className="text-brand-400 hover:underline">wishlist</Link>.
        </p>
      </div>

      {/* Wallet — test-mode play money for the CompareEmpire Marketplace */}
      <div className="card-surface mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-white">Wallet</h2>
            <p className="text-sm text-slate-400">
              Play-money balance for buying on the {SITE_NAME} Marketplace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold text-accent">
              {formatMoney(account?.balanceCents ?? 0, "AUD")}
            </span>
            <TopUpButton />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          This is a test-mode demo wallet — no real payment is processed. Top-ups add
          play money you can spend on marketplace listings.
        </p>
      </div>

      {/* Your marketplace listings */}
      <div className="card-surface mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-white">Your marketplace listings</h2>
            <p className="text-sm text-slate-400">
              {listings.length} active{" "}
              {account?.verifiedSeller ? "· verified seller" : ""}
            </p>
          </div>
          {account?.verifiedSeller && (
            <Link href="/sell" className="btn-primary">List a card →</Link>
          )}
        </div>

        {listings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            {account?.verifiedSeller
              ? "You have no active listings. Head to Sell to list a card."
              : "You have no active listings. Listing is limited to verified sellers."}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-ink-800">
            {listings.map((l) => {
              const c = conditionInfo(l.condition);
              return (
                <li key={l.id} className="flex items-center gap-3 py-3">
                  <span className="chip bg-ink-800 font-bold" style={{ color: c.color }} title={c.full}>
                    {c.label}
                  </span>
                  {l.isFoil && <span className="chip bg-gold/15 font-semibold text-gold">✦</span>}
                  <Link
                    href={`/card/${l.card.slug ?? l.card.id}`}
                    className="min-w-0 flex-1 truncate text-sm text-white hover:underline"
                  >
                    {l.card.name}{" "}
                    <span className="text-slate-500">{l.card.collectorNumber}</span>
                    {l.quantity > 1 && <span className="text-slate-500"> · ×{l.quantity}</span>}
                  </Link>
                  <span className="shrink-0 text-sm font-semibold text-accent">
                    {formatMoney(l.priceCents, l.currency)}
                  </span>
                  <CancelListingButton id={l.id} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
