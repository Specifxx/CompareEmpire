import { WishlistView } from "@/components/WishlistView";
import { PriceAlertButton } from "@/components/PriceAlertButton";

export const metadata = {
  title: "Your Wishlist",
  robots: { index: false },
};

export default function WishlistPage() {
  return (
    <div>
      <div className="card-surface mb-5 overflow-hidden">
        <div className="border-l-2 border-brand-500 bg-ink-850 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-white">Your Wishlist</h1>
              <p className="mt-1 text-sm text-slate-300">
                Cards you&apos;re tracking, saved on this device. Add your email to get a
                heads-up whenever one of them gets cheaper.
              </p>
            </div>
            <PriceAlertButton />
          </div>
        </div>
      </div>
      <WishlistView />
    </div>
  );
}
