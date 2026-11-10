import { jsonLd } from "@/lib/seo";
import { faqJsonLd, type HubFaq } from "@/lib/hub-summary";

/** The server-rendered summary above a hub's grid (lib/hub-summary.ts): plain paragraphs, today's numbers. */
export function HubSummaryText({ paragraphs, title }: { paragraphs: readonly string[]; title: string }) {
  if (!paragraphs.length) return null;
  return (
    <section aria-label={title} className="mt-4 max-w-3xl space-y-3 text-[15px] leading-7 text-muted">
      {paragraphs.map((t, i) => (
        <p key={i}>{t}</p>
      ))}
    </section>
  );
}

/** The questions under a hub's grid, answered from the same numbers; the FAQPage markup goes with the visible answers. */
export function HubFaqSection({ faq, id = "hub-faq" }: { faq: readonly HubFaq[]; id?: string }) {
  if (faq.length < 2) return null;
  return (
    <section className="mt-14 max-w-3xl" aria-labelledby={id}>
      <h2 id={id} className="font-display text-2xl font-bold tracking-tight">
        Questions about these prices
      </h2>
      <div className="mt-5 grid gap-3">
        {faq.map((f) => (
          <details key={f.q} className="card p-5">
            <summary className="cursor-pointer font-semibold">{f.q}</summary>
            <p className="mt-2 text-sm leading-6 text-muted">{f.a}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqJsonLd(faq)) }} />
    </section>
  );
}
