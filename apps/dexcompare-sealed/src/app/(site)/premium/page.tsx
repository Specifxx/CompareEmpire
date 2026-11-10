import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PremiumPanel } from "@/components/premium/PremiumPanel";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";
import { PREMIUM_PRICE_LINE } from "@/lib/premium-member";

// DexCompare Premium (owner, 2026-11-10): a RiftCompare Premium account works here. Static; the browser asks RiftCompare.
const DESCRIPTION = `Premium for ${SITE_NAME}: an email when a sold-out Pokémon sealed product is back in stock, up to 200 price alerts and a watch list. ${PREMIUM_PRICE_LINE}. Comparing prices stays free.`;
export const metadata: Metadata = {
  title: `${SITE_NAME} Premium: back-in-stock alerts`,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/premium` },
};

export default function PremiumPage() {
  return (
    <div className="page max-w-3xl py-12">
      <Breadcrumbs items={[{ href: "/", label: SITE_NAME }, { label: "Premium" }]} />
      <div className="prose-dex mt-6">
        <h1>{SITE_NAME} Premium</h1>
        <p>
          Comparing Pokémon sealed prices stays free, and so do price alerts and the weekly biggest-drops email. Premium is for people who hunt sold-out product.
        </p>
      </div>
      <div className="mt-6">
        <PremiumPanel />
      </div>
      <div className="prose-dex mt-8">
        <h2>What you get</h2>
        <ul>
          <li><strong>Back-in-stock alerts.</strong> On a product no store has in stock, tap once and we email you when a store has it again (checked after each daily price update).</li>
          <li><strong>Up to 200 price alerts</strong> instead of 25.</li>
          <li><strong>A watch list</strong> at <a href="/watches">My watches</a>: every alert you have set, with the lowest in-stock price now, and a button to stop each.</li>
        </ul>
        <h2>How it works</h2>
        <p>
          Premium is a <strong>RiftCompare Premium</strong> membership, our sister site, so one account and one payment cover both. You sign up and pay on riftcompare.com (Stripe),
          then sign in there and come straight back. {SITE_NAME} stores nothing about you: your browser keeps a sign-in token and asks RiftCompare whether your membership is active.
          If it lapses, the extras stop at the next check; your free alerts keep working.
        </p>
        <h2>What it does not do</h2>
        <p>
          It does not remove ads, change which stores are shown or in what order, or promise stock: alerts use the same store feeds as the site, so a product that sells out within hours can be gone by the time you click.
          Prices are the lowest in-stock store price, before postage.
        </p>
        <p className="text-sm text-muted">Questions? <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>. Billing is managed in your RiftCompare account.</p>
      </div>
    </div>
  );
}
