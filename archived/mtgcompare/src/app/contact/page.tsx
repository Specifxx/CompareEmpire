import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata = {
  title: "Contact & Feedback — MTGCompare",
  description: "Get in touch with MTGCompare — report a price issue, suggest a store to add, or send feedback.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="card-surface overflow-hidden">
        <div className="relative bg-gradient-to-br from-brand-600/25 via-ink-850 to-gold/15 px-6 py-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-ink-950/60 text-2xl shadow-glow">
            ✉️
          </div>
          <h1 className="text-2xl font-extrabold text-white">Contact &amp; Feedback</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-300">
            Spotted a wrong price, a missing store, or have an idea to make MTGCompare better?
            We&apos;d genuinely love to hear from you — just send us an email.
          </p>

          <a
            href={`mailto:${CONTACT_EMAIL}?subject=MTGCompare%20feedback`}
            className="btn-primary mt-6 inline-flex text-base"
          >
            ✉️ Email {CONTACT_EMAIL}
          </a>

          <p className="mt-4 text-xs text-slate-500">
            We read every message and usually reply within a day or two.
          </p>
        </div>
      </div>

      <div className="mt-4 text-center text-sm text-slate-500">
        New to collecting?{" "}
        <Link href="/guides" className="text-brand-400 hover:underline">Read the collecting guides →</Link>
      </div>
    </div>
  );
}
