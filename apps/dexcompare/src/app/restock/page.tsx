import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { FEATURED_RESTOCKS, restockTitleRegex } from "@/lib/restocks";
import { getSealedGroups, type SealedGroup } from "@/lib/sealed-import";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES } from "@/lib/country";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pokémon drops & restocks — new releases, preorders and restock alerts",
  description:
    "Every new and upcoming Pokémon TCG release with the cheapest live preorder/stock across stores in Australia, New Zealand, the US and the UK — plus free restock alerts for sold-out sets.",
  alternates: { canonical: "/restock" },
};

// A set counts as a "drop" while it's upcoming or freshly released — the window
// where preorder/launch prices vary wildly between stores and selling out is
// the norm. 35 days post-release ≈ when supply normalises.
const POST_RELEASE_DAYS = 35;

interface Drop {
  setCode: string;
  setName: string;
  releaseDate: string;
  upcoming: boolean;
  box: SealedGroup | null; // cheapest Booster Box group
  etb: SealedGroup | null; // cheapest Elite Trainer Box group
  groupCount: number;
}

function buildDrops(groups: SealedGroup[], todayIso: string): Drop[] {
  const cutoff = new Date(Date.now() - POST_RELEASE_DAYS * 86400e3).toISOString().slice(0, 10);
  const bySet = new Map<string, Drop>();
  for (const g of groups) {
    if (!g.setCode || !g.setName || !g.releaseDate) continue;
    if (g.releaseDate < cutoff) continue; // old set — not a drop
    let d = bySet.get(g.setCode);
    if (!d) {
      d = {
        setCode: g.setCode,
        setName: g.setName,
        releaseDate: g.releaseDate,
        upcoming: g.releaseDate > todayIso,
        box: null,
        etb: null,
        groupCount: 0,
      };
      bySet.set(g.setCode, d);
    }
    d.groupCount++;
    if (g.productType === "Booster Box" && !d.box) d.box = g; // groups are pre-sorted cheapest-first
    if (g.productType === "Elite Trainer Box" && !d.etb) d.etb = g;
  }
  // Soonest release first for upcoming; newest first for released.
  return [...bySet.values()].sort((a, b) =>
    a.upcoming === b.upcoming ? (a.upcoming ? a.releaseDate.localeCompare(b.releaseDate) : b.releaseDate.localeCompare(a.releaseDate)) : a.upcoming ? -1 : 1
  );
}

export default async function DropsIndex() {
  const country = getCountry();
  const info = COUNTRIES[country];
  const todayIso = new Date().toISOString().slice(0, 10);

  const [groups, sealedTitles] = await Promise.all([
    getSealedGroups(country),
    prisma.sealedListing.findMany({ where: { country, inStock: true }, select: { title: true } }),
  ]);
  const drops = buildDrops(groups, todayIso);

  // In-stock flag per featured restock tracker for the visitor's market.
  const liveSlugs = new Set(
    FEATURED_RESTOCKS.filter((p) => {
      const re = restockTitleRegex(p);
      return sealedTitles.some((s) => re.test(s.title));
    }).map((p) => p.slug)
  );

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold text-white">Drops &amp; restocks</h1>
        <p className="mt-1 max-w-2xl text-slate-400">
          Every new and upcoming Pokémon release with the cheapest live {info.adjective} preorder or stock —
          plus free restock alerts for the sets that sell out in minutes. No account needed.
        </p>
      </header>

      {/* New & upcoming releases — where to preorder/buy cheapest, right now. */}
      {drops.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-extrabold text-white">New &amp; upcoming releases</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {drops.map((d) => {
              const lead = d.box ?? d.etb;
              return (
                <div key={d.setCode} className="card-surface flex flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`chip font-semibold ${d.upcoming ? "bg-sky-500/15 text-sky-300" : "bg-brand-500/20 text-brand-300"}`}>
                      {d.upcoming ? `Releases ${d.releaseDate}` : `Released ${d.releaseDate}`}
                    </span>
                    <span className="chip bg-ink-800 text-slate-400">
                      {d.groupCount} {d.groupCount === 1 ? "product" : "products"} tracked
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-white">{d.setName}</h3>
                  <div className="mt-2 flex-1 space-y-1.5 text-sm">
                    {d.box && (
                      <DropRow
                        label="Booster Box"
                        group={d.box}
                        currency={info.currency}
                        upcoming={d.upcoming}
                      />
                    )}
                    {d.etb && (
                      <DropRow label="Elite Trainer Box" group={d.etb} currency={info.currency} upcoming={d.upcoming} />
                    )}
                    {!d.box && !d.etb && (
                      <p className="text-slate-500">No Box/ETB listed in {country} yet — check the full set products.</p>
                    )}
                  </div>
                  <Link
                    href={lead ? `/sealed/${lead.slug}` : `/sealed?q=${encodeURIComponent(d.setName)}`}
                    className="mt-3 text-sm font-semibold text-brand-400 hover:underline"
                  >
                    Compare every store →
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Restock trackers — the sold-out sets people camp for. */}
      <section>
        <h2 className="mb-3 text-lg font-extrabold text-white">Restock trackers</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURED_RESTOCKS.map((p) => {
            const live = liveSlugs.has(p.slug);
            return (
              <Link
                key={p.slug}
                href={`/restock/${p.slug}`}
                className="card-surface flex flex-col p-5 transition-colors hover:border-ink-600"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip bg-ink-800 text-slate-400">{p.series}</span>
                  <span className={`chip font-semibold ${live ? "bg-brand-500/20 text-brand-300" : "bg-rose-500/15 text-rose-300"}`}>
                    {live ? `● In stock in ${country}` : `● Sold out in ${country}`}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold text-white">{p.shortName}</h3>
                <p className="mt-1 line-clamp-3 flex-1 text-sm text-slate-400">{p.blurb}</p>
                <span className="mt-3 text-sm font-semibold text-brand-400">View tracker &amp; set an alert →</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function DropRow({ label, group, currency, upcoming }: { label: string; group: SealedGroup; currency: string; upcoming: boolean }) {
  const live = group.lowestPriceCents != null;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-300">{label}</span>
      {live ? (
        <span className="font-bold text-accent">
          {upcoming ? "preorder " : "from "}
          <span className="num">{formatMoney(group.lowestPriceCents as number, currency)}</span>
          <span className="ml-1.5 text-[11px] font-semibold text-brand-400">
            {group.storeCount} {group.storeCount === 1 ? "store" : "stores"}
          </span>
        </span>
      ) : (
        <span className="font-semibold text-rose-300">sold out</span>
      )}
    </div>
  );
}
