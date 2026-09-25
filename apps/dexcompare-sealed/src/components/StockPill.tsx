import type { OfferStock } from "@/lib/sealed-offers";

const STYLE: Record<OfferStock | "pre", string> = {
  open: "bg-open-soft text-open",
  pre: "bg-pre-soft text-pre",
  soldout: "bg-sold-soft text-sold",
  unknown: "bg-stale-soft text-stale",
};

export function StockPill({ state, preorder = false, children }: { state: OfferStock; preorder?: boolean; children: React.ReactNode }) {
  const key = state === "open" && preorder ? "pre" : state;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STYLE[key]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${state === "open" ? "animate-pulse" : ""}`} aria-hidden="true" />
      {children}
    </span>
  );
}
