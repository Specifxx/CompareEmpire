import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CardTile } from "@/components/CardTile";
import { Pagination } from "@/components/Pagination";
import { AdSlot } from "@/components/AdSlot";
import { ADSENSE_SLOTS } from "@/lib/ads";
import { buildCardOrderBy, buildCardWhere, cardTileSelect, parsePageNum, parsePageSize, type BrowseQuery } from "@/lib/cards";
import { getSelectedGames } from "@/lib/get-games";
import { GAME_LIST, isGameKey } from "@/lib/games";

export const dynamic = "force-dynamic";

export function generateMetadata({ searchParams }: { searchParams: BrowseQuery }): Metadata {
  // Search-result and filtered views are infinite query permutations — keep them
  // out of the index (and never let them claim to be the canonical /browse).
  const isFiltered = Boolean(searchParams.q || searchParams.game || searchParams.set || searchParams.kind);
  return {
    title: "Browse cards across all five TCGs",
    description:
      "Search and filter every Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece and Riftbound card — with live market prices and vendor comparisons.",
    alternates: { canonical: "/browse" },
    ...(isFiltered ? { robots: { index: false, follow: true } } : {}),
  };
}

const SORTS: { key: string; label: string }[] = [
  { key: "price_desc", label: "Price: high → low" },
  { key: "price_asc", label: "Price: low → high" },
  { key: "newest", label: "Newest" },
  { key: "name", label: "Name" },
];

export default async function BrowsePage({ searchParams }: { searchParams: BrowseQuery }) {
  const selected = getSelectedGames();
  const where = buildCardWhere(searchParams, selected);
  const orderBy = buildCardOrderBy(searchParams.sort);
  const size = parsePageSize(searchParams.size);
  const page = parsePageNum(searchParams.page);

  const [total, cards] = await Promise.all([
    prisma.card.count({ where }),
    prisma.card.findMany({ where, orderBy, select: cardTileSelect, skip: (page - 1) * size, take: size }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / size));

  const href = (overrides: Partial<BrowseQuery>) => {
    const merged: Record<string, string | undefined> = { ...searchParams, ...overrides, page: undefined };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `/browse?${s}` : "/browse";
  };

  const activeGame = searchParams.game && isGameKey(searchParams.game) ? searchParams.game : "";

  return (
    <div className="flex flex-col gap-5">
      <AdSlot slot={ADSENSE_SLOTS.browse} format="horizontal" height={90} />

      {/* Game filter chips (scoped to the visitor's selection by default). */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={href({ game: undefined })}
          className={`chip border px-3 py-1.5 text-sm ${!activeGame ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-ink-700 text-slate-300 hover:border-brand-500"}`}
        >
          My games
        </Link>
        {GAME_LIST.map((g) => (
          <Link
            key={g.key}
            href={href({ game: g.key })}
            className={`chip border px-3 py-1.5 text-sm ${activeGame === g.key ? "border-brand-500 bg-brand-500/15" : "border-ink-700 hover:border-brand-500"}`}
            style={{ color: g.color }}
          >
            {g.icon} {g.short}
          </Link>
        ))}
        <span className="mx-1 hidden border-l border-ink-700 sm:block" />
        <Link
          href={href({ kind: searchParams.kind === "sealed" ? undefined : "sealed" })}
          className={`chip border px-3 py-1.5 text-sm ${searchParams.kind === "sealed" ? "border-gold bg-gold/10 text-gold" : "border-ink-700 text-slate-300 hover:border-gold"}`}
        >
          📦 Sealed only
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          <span className="font-semibold text-white">{total.toLocaleString()}</span>{" "}
          {total === 1 ? "product" : "products"}
          {searchParams.q && <> for <span className="text-brand-400">“{searchParams.q}”</span></>}
          {total > 0 && <span className="text-slate-600"> · page {page} of {totalPages}</span>}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={href({ sort: s.key })}
              className={`rounded-lg px-2.5 py-1.5 font-medium ${
                (searchParams.sort ?? "price_desc") === s.key ? "bg-ink-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="card-surface grid place-items-center p-16 text-center">
          <p className="text-lg font-semibold text-white">{total > 0 ? "Nothing on this page" : "No cards found"}</p>
          <p className="mt-1 text-sm text-slate-400">
            {total > 0 ? "Try an earlier page." : "Try a different search, game or filter."}
          </p>
          <Link href="/browse" className="btn-primary mt-4">Reset</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {cards.map((c) => (
              <CardTile key={c.id} card={c} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} params={searchParams as Record<string, string | undefined>} />
        </>
      )}
    </div>
  );
}
