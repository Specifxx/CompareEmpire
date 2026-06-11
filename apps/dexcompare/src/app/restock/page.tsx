import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { FEATURED_RESTOCKS, restockTitleRegex } from "@/lib/restocks";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES } from "@/lib/country";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pokémon Restock Trackers — get an alert when sold-out sets restock",
  description:
    "Free restock trackers for the most sought-after, sold-out Pokémon TCG sets. See live stock across stores in Australia, New Zealand, the US and the UK, and get an email the moment a product is back in stock.",
  alternates: { canonical: "/restock" },
};

export default async function RestockIndex() {
  const country = getCountry();
  const info = COUNTRIES[country];

  // In-stock flag per featured product for the visitor's market.
  const sealed = await prisma.sealedListing.findMany({
    where: { country, inStock: true },
    select: { title: true },
  });
  const liveSlugs = new Set(
    FEATURED_RESTOCKS.filter((p) => {
      const re = restockTitleRegex(p);
      return sealed.some((s) => re.test(s.title));
    }).map((p) => p.slug)
  );

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-extrabold text-white">Restock trackers</h1>
        <p className="mt-1 text-slate-400">
          The most-wanted, frequently-sold-out Pokémon sets — with live {info.adjective} stock and a free
          email alert the moment they&apos;re back. No account needed.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURED_RESTOCKS.map((p) => {
          const live = liveSlugs.has(p.slug);
          return (
            <Link
              key={p.slug}
              href={`/restock/${p.slug}`}
              className="card-surface flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip bg-ink-800 text-slate-400">{p.series}</span>
                <span className={`chip font-semibold ${live ? "bg-brand-500/20 text-brand-300" : "bg-rose-500/15 text-rose-300"}`}>
                  {live ? `● In stock in ${country}` : `● Sold out in ${country}`}
                </span>
              </div>
              <h2 className="mt-2 text-lg font-bold text-white">{p.shortName}</h2>
              <p className="mt-1 line-clamp-3 flex-1 text-sm text-slate-400">{p.blurb}</p>
              <span className="mt-3 text-sm font-semibold text-brand-400">View tracker &amp; set an alert →</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
