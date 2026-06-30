import { DeckBuilder } from "@/components/DeckBuilder";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES } from "@/lib/country";

export const metadata = {
  title: `Deck Builder & Pricing — ${SITE_NAME}`,
  // Collapse the infinite ?list=<base64> permutations onto one canonical — they
  // all duplicate the same tool.
  alternates: { canonical: "/deck" },
};

export default function DeckPage({ searchParams }: { searchParams: { list?: string } }) {
  const country = getCountry();
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Pokémon Deck Builder & Pricing",
            url: `${SITE_URL}/deck`,
            applicationCategory: "UtilityApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: COUNTRIES[country].currency },
          }),
        }}
      />
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-white">Deck Builder &amp; Pricing</h1>
        <p className="mt-1 text-sm text-slate-400">
          Paste a Pokémon decklist and get every card matched with the cheapest
          Australian price and a full deck total.
        </p>
      </div>
      <DeckBuilder initialList={searchParams.list} />
    </div>
  );
}
