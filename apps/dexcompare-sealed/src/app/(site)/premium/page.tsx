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
        <p className="text-lg">
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
          Sign in on {SITE_NAME} with Google or an emailed link (no password), pick monthly or yearly, and start the 14-day trial through Stripe&rsquo;s secure checkout.
          You are not charged until day 15, and you can cancel any time from <strong>Manage billing</strong> on this page. Your membership also works on our sister site RiftCompare,
          with the same account. If it lapses, the extras stop; your free alerts keep working.
        </p>
        <h2>What it does not do</h2>
        <p>
          It does not remove ads, change which stores are shown or in what order, or promise stock: alerts use the same store feeds as the site, so a product that sells out within hours can be gone by the time you click.
          Prices are the lowest in-stock store price, before postage.
        </p>
        <p className="text-sm"><a href="/premium/restock-alerts">How a back-in-stock alert works</a></p>
        <p className="text-sm text-muted">Questions? <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>. Billing: Manage billing on this page once you are signed in.</p>
      </div>
    </div>
  );
}
