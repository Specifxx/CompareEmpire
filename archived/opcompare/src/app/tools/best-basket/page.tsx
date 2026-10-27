import type { Metadata } from "next";
import { BestBasketView } from "@/components/BestBasketView";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Best Basket — Cheapest Way to Buy Your Whole Wishlist | OPCompare",
  description:
    "Price your entire One Piece card wishlist at once: see the cheapest single store, or the cheapest split across stores, so you know exactly what you'd pay before checking out.",
  alternates: { canonical: "/tools/best-basket" },
  openGraph: { title: "Best Basket — price your whole wishlist", url: `${SITE_URL}/tools/best-basket` },
};

export default function BestBasketPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">🧺 Best Basket</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Prices your whole wishlist at once — the cheapest single store that covers it, versus splitting across
          stores for the lowest total. No price history needed, just today&apos;s live listings.
        </p>
      </div>
      <BestBasketView />
    </div>
  );
}
