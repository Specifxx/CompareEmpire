import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { SealedArt } from "./SealedArt";
import type { SealedGroup } from "@/lib/sealed-import";

// A single sealed product tile for the /sealed grid, homepage new-arrivals and
// related rails. Server component (no interactivity) — links to the compare page.
// Images come from arbitrary store/eBay/TCGplayer CDNs, so a plain <img> (lazy)
// is used rather than next/image (which would need every host allow-listed).
export function SealedTile({ group, currency }: { group: SealedGroup; currency: string }) {
  const g = group;
  const soldOut = g.lowestPriceCents == null;
  return (
    <Link
      href={`/sealed/${g.slug}`}
      className="cv-auto group card-surface relative flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-glow"
    >
      <div className="relative grid aspect-square w-full place-items-center overflow-hidden bg-gradient-to-br from-ink-850 to-ink-900 p-4">
        {g.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={g.imageUrl}
            alt={g.name}
            loading="lazy"
            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <SealedArt setCode={g.setCode} productType={g.productType} className="h-full w-full" />
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

      <div className="flex flex-1 flex-col gap-1.5 border-t border-ink-700 p-3">
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
                <div className="text-lg font-bold text-accent">{formatMoney(g.lowestPriceCents as number, currency)}</div>
              </>
            )}
          </div>
          {g.totalCount > 0 && (
            <div className="text-right text-[11px] font-semibold text-brand-400">
              {g.totalCount} {g.totalCount === 1 ? "store" : "stores"}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
