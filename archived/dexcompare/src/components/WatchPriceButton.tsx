"use client";

import { useState } from "react";

// Per-card "watch this price" CTA. Reuses the existing /api/alerts/subscribe
// endpoint (built for the wishlist-wide PriceAlertModal) with a single-card
// cardIds array — the endpoint already accepts that shape, so this is a new
// UI on existing infra, not a new subscription system. Storage is one row per
// (email, card, market) in the existing PriceAlert table — bounded by
// subscriber count, not card count.
export function WatchPriceButton({ cardId, cardName, market }: { cardId: string; cardName: string; market: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"form" | "submitting" | "done" | "error">("form");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim();
    if (!addr) return;
    setPhase("submitting");
    try {
      const res = await fetch("/api/alerts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addr, cardIds: [cardId], market }),
      });
      setPhase(res.ok ? "done" : "error");
    } catch {
      setPhase("error");
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-ink-600 bg-ink-900/50 p-3">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="btn-ghost w-full text-sm">
          🔔 Watch this price — email me when it drops
        </button>
      ) : phase === "done" ? (
        <p className="text-center text-sm text-brand-300">
          ✓ Watching {cardName}. We&apos;ll email you the moment the price drops. Check your inbox to confirm.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input min-w-0 flex-1"
            aria-label="Email for price-drop alerts"
          />
          <button type="submit" disabled={phase === "submitting"} className="btn-primary shrink-0 text-sm">
            {phase === "submitting" ? "Subscribing…" : "Notify me"}
          </button>
          {phase === "error" && (
            <p className="w-full text-xs text-rose-400">Something went wrong — please try again.</p>
          )}
          <p className="w-full text-[11px] text-slate-500">No account needed. Unsubscribe anytime.</p>
        </form>
      )}
    </div>
  );
}
