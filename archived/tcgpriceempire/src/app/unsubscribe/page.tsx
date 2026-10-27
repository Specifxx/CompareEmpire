"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Summary {
  active: boolean;
  email?: string;
  count: number;
  cards?: { name: string; setName: string }[];
}

type State =
  | { phase: "loading" }
  | { phase: "ready"; summary: Summary }
  | { phase: "done"; removed: number }
  | { phase: "invalid" };

// Token-addressed unsubscribe page reached from the footer of every alert
// email. Loads what the token covers, then removes ALL of that email's alerts
// on confirm. A client page reading the token from window.location (rather
// than useSearchParams) so it needs no Suspense boundary to prerender.
export default function UnsubscribePage() {
  const [state, setState] = useState<State>({ phase: "loading" });
  const [working, setWorking] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(t);
    if (!t) {
      setState({ phase: "invalid" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/alerts/unsubscribe?token=${encodeURIComponent(t)}`, { cache: "no-store" });
        const data: Summary = await res.json();
        if (cancelled) return;
        // No active rows → already unsubscribed; treat as done.
        if (!data.active) setState({ phase: "done", removed: 0 });
        else setState({ phase: "ready", summary: data });
      } catch {
        if (!cancelled) setState({ phase: "invalid" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirm() {
    setWorking(true);
    try {
      const res = await fetch("/api/alerts/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      setState({ phase: "done", removed: data.removed ?? 0 });
    } catch {
      setState({ phase: "invalid" });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="card-surface p-6">
        {state.phase === "loading" && <p className="text-sm text-slate-400">Loading…</p>}

        {state.phase === "invalid" && (
          <>
            <h1 className="text-xl font-bold text-white">Link not valid</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              This unsubscribe link looks broken or has already been used. If you keep getting emails, reply to one
              and we&apos;ll sort it out.
            </p>
            <Link href="/" className="btn-ghost mt-4">
              Back to TCGPriceEmpire
            </Link>
          </>
        )}

        {state.phase === "ready" && (
          <>
            <h1 className="text-xl font-bold text-white">Unsubscribe from price alerts</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              You&apos;re currently watching{" "}
              <strong className="text-white">
                {state.summary.count === 1 ? "1 card" : `${state.summary.count} cards`}
              </strong>{" "}
              with <strong className="text-white">{state.summary.email}</strong>. Confirm below to stop all price
              alert emails for this address.
            </p>
            {state.summary.cards && state.summary.cards.length > 0 && (
              <ul className="mt-3 max-h-40 overflow-auto rounded-xl border border-ink-700 bg-ink-950/50 p-3 text-xs text-slate-400">
                {state.summary.cards.map((c, i) => (
                  <li key={i} className="truncate py-0.5">
                    {c.name} <span className="text-slate-600">· {c.setName}</span>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={confirm} disabled={working} className="btn-primary mt-4 w-full">
              {working ? "Unsubscribing…" : "Unsubscribe from all"}
            </button>
            <Link href="/" className="mt-2 block text-center text-xs text-slate-500 hover:text-slate-300">
              Keep my alerts
            </Link>
          </>
        )}

        {state.phase === "done" && (
          <>
            <h1 className="text-xl font-bold text-white">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {state.removed > 0
                ? "We've removed your price alerts. You won't get any more of these emails."
                : "You're already unsubscribed — there are no active price alerts for this link."}
            </p>
            <Link href="/" className="btn-ghost mt-4">
              Back to TCGPriceEmpire
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
