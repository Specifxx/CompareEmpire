import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What DexCompare collects (very little) and why.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

// Bump when what is collected changes, not for wording.
const LAST_UPDATED = "28 September 2026";

export default function Privacy() {
  return (
    <div className="page max-w-3xl py-12">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Privacy</h1>
      <p className="mt-2 text-sm text-faint">Last updated {LAST_UPDATED}</p>
      <div className="prose-dex mt-6">
        <p>DexCompare has no accounts, doesn&rsquo;t ask for your email, and sets no advertising cookies. Here is everything we collect.</p>
        <h2>Analytics</h2>
        <p>
          We use Vercel Web Analytics to count page views, and clicks on outbound buy links. A page view is recorded by its path only: what you
          type into the search box is stripped from the address before it is counted. Each click records the retailer the link goes
          to (for example &ldquo;Pokebox (AU)&rdquo;, &ldquo;TCGplayer&rdquo; or &ldquo;eBay (ebay.com.au)&rdquo;) and where on the page it
          was (for example the best-price button or the price table), together with the page it happened on and the anonymous context
          Vercel Web Analytics attaches to every page view: the referring page, your approximate location (country, region, city) and
          your browser, operating system and device type. It uses no cookies, collects no personal data and doesn&rsquo;t identify you,
          on this site or across others.
        </p>
        <h2>Links to stores, eBay and TCGplayer</h2>
        <p>
          When you follow a link to a store, eBay or TCGplayer, that site&rsquo;s own privacy policy applies. eBay links carry an eBay Partner
          Network tag, and TCGplayer links pass through TCGplayer&rsquo;s affiliate network (Impact), so they can credit us for the referral.
          Store links are plain links.
        </p>
        <h2>Server logs</h2>
        <p>
          The host (Vercel) keeps ordinary request logs for a short time for security and debugging, as every web host does. We do not use
          them to identify visitors.
        </p>
        <h2>Contact</h2>
        <p>
          Questions, or want your data removed? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> — see <Link href="/contact">contact</Link>.
        </p>
      </div>
    </div>
  );
}
