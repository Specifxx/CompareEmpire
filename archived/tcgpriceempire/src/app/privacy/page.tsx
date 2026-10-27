import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How TCGPriceEmpire handles data: no accounts, no personal data sold, anonymous analytics only.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Privacy policy</h1>
      <div className="card-surface mt-6 space-y-4 p-6 text-sm leading-relaxed text-slate-300">
        <p>
          {SITE_NAME} is a read-only price-comparison site: there are no accounts, no sign-ups, and we do
          not collect names, emails or payment details.
        </p>
        <h2 className="text-base font-bold text-white">What we store</h2>
        <p>
          A cookie remembering which games you selected (so the site stays tailored to you), anonymous
          page-view analytics (Vercel Analytics), and anonymous outbound-click counts per vendor (so we
          know which comparisons are useful). None of this identifies you.
        </p>
        <h2 className="text-base font-bold text-white">Advertising &amp; affiliate links</h2>
        <p>
          We show ads via Google AdSense, which may use cookies to personalise ads — see Google&apos;s ad
          policies for controls. Outbound links to vendors (TCGplayer, eBay, Amazon and others) may include
          an affiliate tag that earns us a commission at no cost to you.
        </p>
        <h2 className="text-base font-bold text-white">Contact</h2>
        <p>
          Questions about this policy: <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold hover:underline">{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </div>
  );
}
