"use client";

import { useMemo, useState } from "react";

export type ReviewView = {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  author?: string | null;
  createdAt: string; // ISO string (serialised from the server)
};

// Read-only star row. `value` may be fractional (e.g. an average) — we fill whole
// stars and leave the rest empty (no half-star glyph, kept deliberately simple).
function Stars({ value, className = "" }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={`inline-flex ${className}`} aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= full ? "text-gold" : "text-ink-600"}>
          ★
        </span>
      ))}
    </span>
  );
}

// Clickable 1–5 picker for the form.
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className={`text-2xl leading-none transition-colors ${n <= shown ? "text-gold" : "text-ink-600 hover:text-gold/60"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Genuine user reviews for a card. Renders the aggregate, the list, and a no-account
// submission form. These reviews are the ONLY source of the page's review markup —
// nothing here is fabricated.
export function CardReviews({
  cardId,
  cardName,
  initialReviews,
}: {
  cardId: string;
  cardName: string;
  initialReviews: ReviewView[];
}) {
  const [reviews, setReviews] = useState<ReviewView[]>(initialReviews);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const { count, avg } = useMemo(() => {
    const c = reviews.length;
    const a = c ? reviews.reduce((s, r) => s + r.rating, 0) / c : 0;
    return { count: c, avg: a };
  }, [reviews]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError("Please pick a star rating.");
      return;
    }
    setState("submitting");
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, rating, title: title.trim(), body: body.trim(), author: author.trim() }),
      });
      if (res.ok) {
        const data = (await res.json()) as { review: ReviewView };
        // Optimistically show the new review and fold it into the aggregate.
        setReviews((prev) => [data.review, ...prev]);
        setState("done");
        setRating(0);
        setTitle("");
        setBody("");
        setAuthor("");
        setOpen(false);
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Something went wrong — please try again.");
        setState("error");
      }
    } catch {
      setError("Something went wrong — please try again.");
      setState("error");
    }
  }

  return (
    <section className="card-surface mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 p-4">
        <div>
          <h2 className="font-bold text-white">Reviews</h2>
          {/* Empty state deliberately renders nothing here — "No reviews yet — be
              the first" as visible copy on every one of ~20k card pages is thin,
              near-duplicate UGC content at scale. The "Write a review" button
              still works with zero reviews; it just isn't announced with filler
              text. */}
          {count > 0 && (
            <div className="mt-1 flex items-center gap-2 text-sm">
              <Stars value={avg} />
              <span className="font-semibold text-white">{avg.toFixed(1)}</span>
              <span className="text-slate-500">
                · {count} {count === 1 ? "review" : "reviews"}
              </span>
            </div>
          )}
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} className="btn-ghost shrink-0">
          {open ? "Cancel" : "Write a review"}
        </button>
      </div>

      {state === "done" && (
        <div className="border-b border-ink-800 bg-brand-500/10 px-4 py-3 text-sm font-semibold text-brand-300">
          Thanks — your review is live. ✓
        </div>
      )}

      {open && (
        <form onSubmit={onSubmit} className="space-y-3 border-b border-ink-800 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Your rating *</label>
            <StarInput value={rating} onChange={setRating} />
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Headline (optional)"
            maxLength={120}
            className="input w-full"
            aria-label="Review headline"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`What did you think of ${cardName}? (optional)`}
            maxLength={2000}
            rows={3}
            className="input w-full"
            aria-label="Your review"
          />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Your name (optional)"
            maxLength={60}
            className="input w-full sm:max-w-xs"
            aria-label="Your name"
          />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button type="submit" disabled={state === "submitting"} className="btn-primary">
            {state === "submitting" ? "Posting…" : "Post review"}
          </button>
        </form>
      )}

      {reviews.length > 0 && (
        <ul className="divide-y divide-ink-800">
          {reviews.map((r) => (
            <li key={r.id} className="p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars value={r.rating} className="text-sm" />
                {r.title && <span className="font-semibold text-white">{r.title}</span>}
              </div>
              {r.body && <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{r.body}</p>}
              <div className="mt-1.5 text-[11px] text-slate-500">
                {r.author?.trim() || "Anonymous"}
                {fmtDate(r.createdAt) ? ` · ${fmtDate(r.createdAt)}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
