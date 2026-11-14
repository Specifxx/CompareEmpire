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
    <section className="mt-16 max-w-3xl sm:mt-20" aria-labelledby={id}>
      <h2 id={id} className="sec-h2">
        Questions about these prices
      </h2>
      {/* Lines, not boxes (the minimal look, 2026-11-13): each question a row that opens (globals.css .faq). */}
      <div className="mt-4 border-t border-line">
        {faq.map((f) => (
          <details key={f.q} className="faq">
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqJsonLd(faq)) }} />
    </section>
  );
}
