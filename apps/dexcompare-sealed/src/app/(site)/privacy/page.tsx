import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What DexCompare collects (very little) and why.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function Privacy() {
  return (
    <div className="page max-w-3xl py-12">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Privacy</h1>
      <div className="prose-dex mt-6">
        <p>DexCompare has no accounts, doesn&rsquo;t ask for your email, and sets no advertising cookies. Here is everything we collect.</p>
        <h2>Analytics</h2>
        <p>We use Vercel Web Analytics to count page views. It doesn&rsquo;t use cookies and doesn&rsquo;t identify you across sites.</p>
        <h2>Links to stores and eBay</h2>
        <p>
          When you follow a link to a store or eBay, that site&rsquo;s own privacy policy applies. eBay links carry an affiliate tag so eBay can
          credit us for the referral.
        </p>
        <h2>Contact</h2>
        <p>
          Questions, or want your data removed? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </div>
  );
}
