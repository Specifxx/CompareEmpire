import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { hubTitle, titleText } from "@/lib/hub-copy";
import { pokemonCounts } from "@/lib/hub-data";
import { POKEMON, pokemonPath } from "@/lib/pokemon-hubs";
import { regionOrNotFound, type Market } from "@/lib/regions";
import { pageMeta, regionAlternates } from "@/lib/seo";

// The Pokémon hubs' index (lib/pokemon-hubs.ts): every Pokémon with a product in the region, most products first.
export const dynamic = "force-dynamic";

const getCounts = cache((market: Market) => pokemonCounts(market));

export async function generateMetadata({ params }: { params: { region: string } }): Promise<Metadata> {
  const r = regionOrNotFound(params.region);
  const title = hubTitle(`Pokémon TCG products by Pokémon in ${r.inName}: Charizard, Pikachu, Eevee`);
  return {
    ...pageMeta({
      title: titleText(title),
      description: `Shop sealed Pokémon TCG by your favourite Pokémon: Charizard, Pikachu, Eevee, Umbreon and more, each compared across ${r.adjective} stores in ${r.currency}.`,
      path: `/${r.region}/pokemon`,
      alternates: regionAlternates(r.region, "/pokemon"),
    }),
    title,
  };
}

export default async function PokemonIndex({ params }: { params: { region: string } }) {
  const r = regionOrNotFound(params.region);
  const counts = await getCounts(r.market);
  const list = POKEMON.filter((p) => (counts.get(p.slug) ?? 0) > 0).sort((a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0) || a.name.localeCompare(b.name));
  return (
    <div className="page py-8">
      <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, { label: "By Pokémon" }]} />
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Shop by Pokémon in {r.inName}</h1>
      <p className="mt-3 max-w-3xl leading-7 text-muted">Collections, tins and premium boxes named for one Pokémon, each with every {r.adjective} store&apos;s price.</p>
      <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => (
          <li key={p.slug}>
            <Link href={pokemonPath(r.region, p.slug)} prefetch={false} className="card flex min-h-12 items-center justify-between gap-2 px-4 py-3 font-semibold hover:text-brand">
              {p.name}
              <span className="text-sm font-normal text-muted">{counts.get(p.slug)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
