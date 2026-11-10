import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PREMIUM_PRICE_LINE } from "@/lib/premium-member";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

// The Premium announcement post (owner, 2026-11-10). Static. Every figure is premium-member.ts's or the Premium page's own; no claim that a
// product will restock or that an alert beats other buyers.
const TITLE = "How to get an email when sold-out Pokémon product restocks";
const DESCRIPTION = `What ${SITE_NAME} Premium adds, what it costs (US$4.99 a month, 14 days free) and what a back-in-stock alert can and can't do.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/premium/restock-alerts` },
};

export default function RestockAlertsPost() {
  return (
    <div className="page max-w-3xl py-12">
      <Breadcrumbs items={[{ href: "/", label: SITE_NAME }, { href: "/premium", label: "Premium" }, { label: "Restock alerts" }]} />
      <article className="prose-dex mt-6">
        <h1>{TITLE}</h1>
        <p className="text-sm text-muted">Published 10 November 2026</p>
        <p>
          Sold-out Pokémon product is the most common reason people miss a good price. <strong>{SITE_NAME} Premium</strong> emails you when a store we compare has a sold-out product in stock again.
          It costs {PREMIUM_PRICE_LINE}.
        </p>
        <h2>What Premium adds</h2>
        <ul>
          <li><strong>Back-in-stock alerts.</strong> On a product no store has in stock, tap “Email me when it’s back” once.</li>
          <li><strong>Up to 200 price alerts</strong> instead of 25.</li>
          <li><strong>A watch list</strong> at <Link href="/watches">My watches</Link>: every alert you’ve set, with the lowest in-stock price now and a button to stop each.</li>
        </ul>
        <h2>What stays free</h2>
        <p>
          Comparing prices across stores is free, and so are normal price alerts and the weekly biggest-drops email. Premium doesn’t change which stores are shown, in what order, or the ads on the page.
        </p>
        <h2>How an alert works</h2>
        <ol>
          <li>Open a sold-out product page.</li>
          <li>Under the price alert you’ll see the restock option. Sign in with your Premium account and tap it.</li>
          <li>After each daily price update we check the stores. The first time one lists it in stock, you get one email with the store’s price and a link.</li>
          <li>If it sells out again before you buy, the alert stays set for the next restock.</li>
        </ol>
        <h2>What it costs and how to try it</h2>
        <p>
          Premium is a RiftCompare Premium membership, our sister site, so one account and one payment cover both. It costs US$4.99 a month or US$39.99 a year, with 14 days free (a card is needed) and
          cancel any time. You sign up on RiftCompare, then come straight back here. {SITE_NAME} stores nothing about you. <Link href="/premium">See the Premium page</Link> to start the free trial.
        </p>
        <h2>What an alert can’t promise</h2>
        <p>
          Alerts read the same store feeds as the site, once after each daily price update, so a product that sells out within hours can be gone by the time you open the email. We can’t reserve stock,
          and the price shown is the store’s own, before postage.
        </p>
        <p className="text-sm text-muted">Questions? <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a></p>
      </article>
    </div>
  );
}
