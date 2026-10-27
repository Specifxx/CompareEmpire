import Link from "next/link";
import { HOT_ITEMS, HOT_UPDATED, type HotItem } from "@/lib/hot";

// The demand magnet: what collectors are hunting right now, front and centre.
// Pure config render (zero queries) — see lib/hot.ts for the curation notes.
const TONE: Record<HotItem["tone"], string> = {
  hot: "bg-rose-500/15 text-rose-300",
  live: "bg-brand-500/20 text-brand-300",
  soon: "bg-sky-500/15 text-sky-300",
  chase: "bg-gold/15 text-gold",
};

export function HotRightNow() {
  return (
    <section aria-label="Hot right now">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-white">Hot right now</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            What collectors are hunting — updated {HOT_UPDATED}.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HOT_ITEMS.map((h) => (
          <Link
            key={h.title}
            href={h.href}
            className="card-surface group flex items-start gap-3 p-4 transition-colors hover:border-ink-600 hover:bg-ink-800"
          >
            <span className="text-2xl" aria-hidden>
              {h.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-white">{h.title}</span>
                <span className={`chip text-[10px] font-semibold ${TONE[h.tone]}`}>{h.badge}</span>
              </span>
              <span className="mt-1 block text-xs leading-snug text-slate-400">{h.sub}</span>
            </span>
            <span className="mt-0.5 shrink-0 text-slate-600 transition-colors group-hover:text-brand-400">
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
