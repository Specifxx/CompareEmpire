import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Thanks, your listing is in review",
  robots: { index: false, follow: false },
};

export default function AdvertiseThanksPage() {
  return (
    <div className="page max-w-2xl py-16">
      <div className="prose-dex">
        <h1>Thanks, we have your listing</h1>
        <p>
          Your card has been held, not charged. We review every listing, usually within two days, and email you when it is approved (your card is then charged and the dates start)
          or if we can&rsquo;t take it (the hold is released and you pay nothing).
        </p>
        <p><Link href="/">Back to {SITE_NAME}</Link></p>
      </div>
    </div>
  );
}
