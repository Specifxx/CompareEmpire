import type { Metadata } from "next";
import Link from "next/link";
import { popularCharacters } from "@/lib/op-character-data";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "One Piece Card Price Guides by Character | OPCompare",
  description:
    "Every character in the One Piece Card Game, each with a price guide covering all their printings — Leaders, Characters and alt-arts — compared live across stores.",
  alternates: { canonical: "/characters" },
  openGraph: { title: "One Piece card price guides by character", url: `${SITE_URL}/characters` },
};

export default async function CharactersIndexPage() {
  // Bounded: the grouped query is capped, and only characters that actually
  // have tracked printings are listed — no empty hubs linked from here.
  const characters = await popularCharacters(500).catch(() => []);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "One Piece card price guides by character",
    url: `${SITE_URL}/characters`,
    itemListElement: characters.slice(0, 100).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      url: `${SITE_URL}/character/${c.slug}`,
    })),
  };

  return (
    <div className="mx-auto max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-slate-300">Home</Link>
        <span>/</span>
        <span className="text-slate-300">Characters</span>
      </nav>
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">One Piece cards by character</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        Every character {SITE_NAME} tracks, with one price guide each covering all of their printings — Leader,
        Character and alt-art — so you can find the cheapest version of the card you actually want.
      </p>

      {characters.length === 0 ? (
        <div className="card-surface mt-8 p-8 text-center text-sm text-slate-400">
          Character guides are being generated — check back shortly.
        </div>
      ) : (
        <div className="mt-8 flex flex-wrap gap-2">
          {characters.map((c) => (
            <Link
              key={c.slug}
              href={`/character/${c.slug}`}
              className="chip border border-ink-700 px-3 py-1.5 text-sm hover:border-brand-500"
            >
              {c.name} <span className="text-slate-600">({c.count})</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
