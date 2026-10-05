import type { Metadata } from "next";
import Link from "next/link";
import { EBAY_BANNER } from "@/lib/affiliate";
import { ebayListingsEnabled } from "@/lib/ebay-listings";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What DexCompare collects (very little) and why.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

// Bump when what is collected changes, not for wording.
const LAST_UPDATED = "5 October 2026";
// Static page: whether the eBay chase-card strips show real listings (the API keys are set when the site is built) decides the wording.
const LISTINGS = ebayListingsEnabled();

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
          Store links are plain links. The eBay banners and links on the site are advertisements, marked &ldquo;Ad&rdquo;; they are ordinary
          links that load no ad script, tracking pixel or cookie from eBay.
          {LISTINGS ? (
            <>
              {" "}
              The chase-card strips are the exception to &ldquo;load nothing from eBay&rdquo;: when one scrolls near the screen, your browser
              asks DexCompare&rsquo;s own server for the current listings (that request carries nothing about you, and our server asks eBay with
              our own key, never with your details), and then loads each listing&rsquo;s thumbnail <b>directly from eBay&rsquo;s image servers</b>
              (ebayimg.com), which shares your IP address and browser type with eBay. We ask your browser not to send the page address along
              (no-referrer). Nothing is loaded until the strip is near the screen, and eBay sets no cookie through it.
            </>
          ) : null}
          <> The card pictures in the &ldquo;chase cards&rdquo; search tiles (home and landing pages, and wherever no listings can be shown) are small files served from this site itself: they make no request to anyone else. Set logos on the set pages are loaded from the Pokémon TCG image catalogue (images.pokemontcg.io / images.scrydex.com), which can see that request.</>
          {EBAY_BANNER && (
            <> The one exception is eBay&rsquo;s own banner image, which is enabled on this site: your browser loads that picture from eBay&rsquo;s servers when the banner scrolls into view, so eBay can see that request.</>
          )}
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
