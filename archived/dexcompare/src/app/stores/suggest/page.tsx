import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata = {
  title: "Suggest a store — DexCompare",
  description: "Know a Pokémon TCG store DexCompare should be comparing? Suggest it and we'll add it to the price comparison.",
  alternates: { canonical: "/stores/suggest" },
};

export default function SuggestStorePage() {
  const subject = encodeURIComponent("Store suggestion for DexCompare");
  const body = encodeURIComponent(
    "Store name:\nWebsite URL:\nMarket (AU/US/UK):\nWhy should DexCompare add it?\n"
  );

  return (
    <div className="mx-auto max-w-xl">
      <div className="card-surface overflow-hidden">
        <div className="relative border-l-2 border-brand-500 bg-ink-850 px-6 py-10 text-center">
          <h1 className="text-2xl font-extrabold text-white">Suggest a store</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-300">
            Know a Pokémon TCG store we&apos;re missing? Tell us who they are and we&apos;ll look at
            adding them to the price comparison — more stores means better prices for everyone.
          </p>

          <a href={`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`} className="btn-primary mt-6 inline-flex text-base">
            Suggest a store
          </a>

          <p className="mt-4 text-xs text-slate-500">
            Include the store&apos;s name, website, and which market it ships to (Australia, US or UK).
          </p>
        </div>
      </div>

      <div className="mt-4 text-center text-sm text-slate-500">
        <Link href="/stores" className="text-brand-400 hover:underline">← See every store we already track</Link>
      </div>
    </div>
  );
}
