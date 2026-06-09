import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Marketplace (Coming Soon) — Buy Pokémon singles direct",
  description:
    "The DexCompare Marketplace is coming soon — buy Pokémon singles directly from verified sellers, with prices compared right alongside every store.",
  alternates: { canonical: "/marketplace" },
};
export const revalidate = 300;

export default async function MarketplacePage() {
  // Verified-seller listings already feed the price comparison; show a live count.
  const [liveListings, sellers] = await Promise.all([
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { verifiedSeller: true } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl py-8">
      <section className="card-surface overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600/25 via-ink-850 to-gold/15 px-6 py-12 text-center">
          <span className="mb-4 inline-block rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gold">
            Coming Soon
          </span>
          <h1 className="mx-auto max-w-2xl text-3xl font-extrabold text-white sm:text-4xl">
            The DexCompare Marketplace
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
            Buy Pokémon singles directly from <strong>verified sellers</strong> — with every price
            compared side-by-side against the stores you already see here. No surprises, no fakes.
          </p>
          <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-4">
            <Stat value={String(sellers)} label="verified sellers" />
            <Stat value={liveListings.toLocaleString()} label="cards listed" />
          </div>

          <div className="mt-7">
            <Link href="/marketplace/browse" className="btn-primary inline-block">
              Test out current marketplace →
            </Link>
            <p className="mt-2 text-xs text-gold">Test mode — browse live listings, add to cart &amp; checkout (no real payment)</p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Feature title="Verified sellers only" body="Every seller is vetted and badged. Buy with confidence — no random listings." />
        <Feature title="Compared automatically" body="Marketplace listings appear right in the card price comparison, in your region's currency." />
        <Feature title="Fair, clear shipping" body="Sellers set transparent shipping up front, so the delivered price is what you see." />
      </section>

      <section className="card-surface mt-8 p-6 text-center">
        <h2 className="text-xl font-extrabold text-white">Want to sell on DexCompare?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
          We’re onboarding a small group of verified sellers first. Buying opens soon — listings made
          now already show in the price comparison across Australia, New Zealand, the US and the UK.
        </p>
        <a href={`mailto:${CONTACT_EMAIL}?subject=DexCompare%20Marketplace%20Seller`} className="btn-primary mt-4 inline-block">
          Apply to become a verified seller
        </a>
      </section>

      <p className="mt-6 text-center text-xs text-slate-500">
        Browsing for now? <Link href="/browse" className="text-brand-400 hover:underline">Compare prices in the database →</Link>
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-ink-900/70 p-3">
      <div className="text-2xl font-extrabold text-gold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="card-surface p-4">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}
