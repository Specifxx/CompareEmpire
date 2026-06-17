import type { Metadata } from "next";
import { RETAILER_LIST } from "@/lib/retailers";
import { COUNTRIES, type Country } from "@/lib/country";
import { CONTACT_EMAIL } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Stores we track — every Pokémon retailer in the comparison",
  description:
    "The full list of Pokémon TCG stores DexCompare compares prices across, by market (Australia, New Zealand, the US and the UK). Don't see your store? Request it.",
  alternates: { canonical: "/stores" },
};

const MARKETS: Country[] = ["AU", "NZ", "US", "GB"];

export default function StoresPage() {
  const byMarket = MARKETS.map((code) => ({
    code,
    info: COUNTRIES[code],
    stores: RETAILER_LIST.filter((r) => (r.country ?? "AU") === code).sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((m) => m.stores.length > 0);
  const total = RETAILER_LIST.length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Stores we track</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          DexCompare compares live prices across {total} Pokémon retailers plus eBay, grouped by
          market below. Every card&apos;s comparison ranks these by total delivered cost (price +
          postage), and prices refresh daily.
        </p>
      </div>

      {byMarket.map((m) => (
        <section key={m.code}>
          <h2 className="mb-3 text-lg font-bold text-white">
            {m.info.flag} {m.info.label}{" "}
            <span className="text-sm font-normal text-slate-500">({m.stores.length})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {m.stores.map((s) => (
              <a
                key={s.key}
                href={s.base}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="card-surface flex flex-col gap-1 p-4 transition-colors hover:border-brand-500"
              >
                <span className="font-semibold text-white">{s.name}</span>
                <span className="text-xs text-slate-500">{s.shippingNote}</span>
              </a>
            ))}
          </div>
        </section>
      ))}

      <section className="card-surface p-6 text-center">
        <h2 className="text-lg font-bold text-white">Don&apos;t see your store?</h2>
        <p className="mx-auto mt-1 max-w-xl text-sm text-slate-400">
          We&apos;re always adding retailers. If there&apos;s a Pokémon store you&apos;d like compared, send us the
          name and website and we&apos;ll look at adding it.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Request a store for DexCompare")}`}
          className="btn-primary mt-4 inline-flex"
        >
          Request a store →
        </a>
      </section>
    </div>
  );
}
