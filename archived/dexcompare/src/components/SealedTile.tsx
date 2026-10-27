"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { SealedGroup } from "@/lib/sealed-import";
import { useSealedQuickView } from "./SealedQuickView";

// A single sealed product tile for the /sealed grid, homepage new-arrivals and
// related rails. A plain left-click opens an instant in-page quick view (no
// navigation = no lag), exactly like the card tiles; the real /sealed/<slug> href
// is kept for SEO, sharing and middle/ctrl-click (open in new tab). Images come
// from arbitrary store/eBay/TCGplayer CDNs, so a plain <img> (lazy) is used
// rather than next/image (which would need every host allow-listed).
export function SealedTile({ group, currency }: { group: SealedGroup; currency: string }) {
  const g = group;
  const soldOut = g.lowestPriceCents == null;
  const { open } = useSealedQuickView();

  function onClick(e: React.MouseEvent) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    open(g, currency);
  }

  return (
    <Link
      href={`/sealed/${g.slug}`}
      prefetch={false}
      onClick={onClick}
      className="cv-auto group card-surface relative flex flex-col overflow-hidden transition-colors hover:border-ink-600"
    >
      <div className="relative grid aspect-square w-full place-items-center overflow-hidden bg-ink-950 p-4">
        {g.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={g.imageUrl}
            alt={g.name}
            loading="lazy"
            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="px-2 text-center text-sm font-bold text-slate-600">{g.productType}</span>
        )}
        <span className="absolute left-2 top-2 chip bg-ink-950/70 text-[10px] font-semibold text-slate-300">
          {g.productType}
        </span>
        {soldOut && (
          <span className="absolute right-2 top-2 chip bg-rose-500/15 text-[10px] font-semibold text-rose-300">
            Sold out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 border-t border-ink-800 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white" title={g.name}>
          {g.name}
        </h3>
        {g.setName && <p className="text-xs text-slate-500">{g.setName}</p>}

        <div className="mt-auto flex items-end justify-between pt-1">
          <div>
            {soldOut ? (
              <div className="text-sm font-medium text-slate-500">Sold out</div>
            ) : (
              <>
                <div className="text-[11px] text-slate-500">from</div>
                <div className="num text-lg font-bold text-accent">{formatMoney(g.lowestPriceCents as number, currency)}</div>
              </>
            )}
          </div>
          {g.totalCount > 0 && (
            <div className="text-right text-[11px] font-semibold text-brand-400">
              <span className="num">{g.totalCount}</span> {g.totalCount === 1 ? "store" : "stores"}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
