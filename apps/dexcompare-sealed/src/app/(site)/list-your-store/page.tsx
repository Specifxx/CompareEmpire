import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";
import { REGION_LIST } from "@/lib/regions";
import { STORES, isMarketplace } from "@/lib/stores";
import { ListYourStore } from "@/components/ListYourStore";
import { storeBadge } from "@/lib/embed";

// The store-owner page every Compare Empire site shares (owner, 2026-11-04).
export const metadata: Metadata = {
  title: "List your Pokémon store, free",
  description: `Run a store that sells Pokémon sealed product? Get it listed on ${SITE_NAME}'s price comparison for free: buyers comparing prices go straight to your product pages.`,
  alternates: { canonical: `${SITE_URL}/list-your-store` },
};

export default function ListYourStorePage() {
  const names = REGION_LIST.map((r) => r.inName);
  const markets = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return (
    <div className="page max-w-3xl py-12">
      <Breadcrumbs items={[{ href: "/", label: SITE_NAME }, { label: "List your store" }]} />
      <div className="prose-dex mt-6">
        {/* The page draws the h1 in the inner pages' header style; the shared component skips its own (2026-11-14). */}
        <h1>List your store on {SITE_NAME}</h1>
        <ListYourStore
          showTitle={false}
          badge={storeBadge(SITE_URL, SITE_NAME, "Pokémon sealed")}
          site={SITE_NAME}
          what="Pokémon sealed product"
          markets={markets}
          storeCount={STORES.filter((s) => !isMarketplace(s)).length}
          regions={REGION_LIST.map((r) => [r.short, r.name])}
          email={CONTACT_EMAIL}
          platforms="Shopify, WooCommerce and BigCommerce"
          pricesRule="an in-stock price under a quarter of what the other stores charge is dropped as a likely mistake"
          suggestHref="/contact#suggest"
          buttonClassName="btn-primary"
        >
          <li><strong>Sealed product only.</strong> Booster boxes, elite trainer boxes, tins and other sealed Pokémon. Singles are not compared here.</li>
        </ListYourStore>
      </div>
    </div>
  );
}
