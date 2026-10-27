"use client";

import { useEffect, useState } from "react";
import { PriceChart, type PricePoint } from "./PriceChart";
import { useCountry } from "./CountryProvider";

// Value-over-time for the whole collection. Posts the visitor's holdings to
// /api/portfolio/history and renders the returned daily totals with the shared
// PriceChart. Re-fetches when the holdings or the selected market change.
export function PortfolioChart({ holdings }: { holdings: { cardId: string; qty: number }[] }) {
  const { country, currency } = useCountry();
  const [points, setPoints] = useState<PricePoint[] | null>(null); // null = loading

  // Stable dependency: the holdings' identity churns on every render, so key off a
  // string of (cardId×qty) + market instead.
  const key =
    country + "|" + holdings.map((h) => `${h.cardId}:${h.qty}`).sort().join(",");

  useEffect(() => {
    let alive = true;
    if (!holdings.length) {
      setPoints([]);
      return;
    }
    setPoints(null);
    fetch("/api/portfolio/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holdings, market: country, windowDays: 90 }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("history"))))
      .then((d: { points: { day: string; cents: number }[] }) => {
        if (!alive) return;
        setPoints(d.points.map((p) => ({ day: new Date(p.day + "T00:00:00Z"), cents: p.cents })));
      })
      .catch(() => {
        if (alive) setPoints([]);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (points === null) {
    return (
      <div className="card-surface grid place-items-center p-10 text-sm text-slate-400">
        Building your value history…
      </div>
    );
  }

  // Fewer than two snapshots — not enough history yet to draw a trend.
  if (points.length < 2) {
    return (
      <div className="card-surface p-5">
        <h2 className="font-bold text-white">Portfolio value over time</h2>
        <p className="mt-2 text-sm text-slate-400">
          Your value-over-time chart appears once a few days of price history build up for the cards you
          own — we snapshot the cheapest price every day.
        </p>
      </div>
    );
  }

  return (
    <PriceChart
      points={points}
      title="Portfolio value over time"
      note="Daily snapshots of your cards' combined cheapest-store value in your market."
      currency={currency}
    />
  );
}
