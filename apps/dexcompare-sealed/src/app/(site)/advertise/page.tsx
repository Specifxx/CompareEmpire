import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeatureListingForm } from "@/components/FeatureListingForm";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";
import { MAX_WEEKS, WEEK_PRICE_USD } from "@/lib/featured-ads";

// Paid featured listings (owner, 2026-11-09). Static; the form talks to RiftCompare's shared service.
export const metadata: Metadata = {
  title: "Feature your listing on DexCompare",
  description: `Put one Pokémon listing, shop or eBay item in front of ${SITE_NAME} shoppers: US$${WEEK_PRICE_USD} a week, reviewed before it goes live, clearly labelled as a paid link.`,
  alternates: { canonical: `${SITE_URL}/advertise` },
};

export default function AdvertisePage({ searchParams }: { searchParams: { cancelled?: string } }) {
  return (
    <div className="page max-w-3xl py-12">
      <Breadcrumbs items={[{ href: "/", label: SITE_NAME }, { label: "Feature your listing" }]} />
      <div className="prose-dex mt-6">
        <h1>Feature your listing on {SITE_NAME}</h1>
        <p>
          Sell Pokémon cards or sealed product? A featured listing puts one item, your shop or an eBay listing in its own box on our region pages, in front of people comparing Pokémon prices.
          It costs <strong>US${WEEK_PRICE_USD} per week</strong> (choose 1 to {MAX_WEEKS} weeks).
        </p>
        {searchParams.cancelled && <p><strong>Checkout was cancelled and nothing was charged.</strong> You can start again below.</p>}
        <h2>How it works</h2>
        <ol>
          <li><strong>Tell us about the listing</strong> below and pay on Stripe. Your card is only <em>held</em>, not charged.</li>
          <li><strong>We review it</strong>, usually within two days. We open the link and check it. If it is approved your card is charged; if not, the hold is released and you pay nothing.</li>
          <li><strong>It goes live automatically</strong> for the weeks you chose, and comes down on its own. Up to three featured listings show at once; if they are full yours starts when the next one ends (we tell you the dates).</li>
        </ol>
        <h2>What we accept</h2>
        <p>
          The link can go anywhere: your own shop, an eBay listing or a social page. It must be a genuine, legal offer you are entitled to make.
          We decline scams, counterfeits, adult material, anything illegal and anything that looks like it could harm a visitor.
        </p>
        <h2>How it is shown</h2>
        <p>
          In a box labelled <strong>Featured listing</strong> and <strong>Paid link</strong>, with &ldquo;Not part of the comparison&rdquo;. It never appears among the price rows, never counts as a store or the best price,
          and a featured listing does not change how any store or product is ranked. It shows your title, photo and the price you type, so keep it accurate.
        </p>
        <h2>Feature your listing</h2>
      </div>
      <FeatureListingForm />
      <p className="mt-8 text-sm text-muted">Questions? <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>.</p>
    </div>
  );
}
