"use client";

import { useState } from "react";
import Link from "next/link";
import { useCountry } from "./CountryProvider";
import { formatMoney } from "@/lib/format";
import type { BulkPriceResult } from "@/app/api/tools/bulk-price/route";

const CHUNK_SIZE = 100;

export function BulkPricerView() {
  const { country, currency } = useCountry();
  const [text, setText] = useState("");
  const [results, setResults] = useState<BulkPriceResult[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [running, setRunning] = useState(false);
  const fmt = (c: number) => formatMoney(c, currency);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await file.text();
    setText(raw);
  }

  async function run() {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setRunning(true);
    setResults([]);
    setProgress({ done: 0, total: lines.length });

    const out: BulkPriceResult[] = [];
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      const chunk = lines.slice(i, i + CHUNK_SIZE);
      try {
        const res = await fetch("/api/tools/bulk-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines: chunk, market: country }),
        });
        if (res.ok) {
          const data = (await res.json()) as { results: BulkPriceResult[] };
          out.push(...data.results);
        } else {
          out.push(...chunk.map((input): BulkPriceResult => ({ input, matched: false, cardId: null, slug: null, name: null, setCode: null, collectorNumber: null, buyCents: null, buyStore: null, sellGuideCents: null })));
        }
      } catch {
        out.push(...chunk.map((input): BulkPriceResult => ({ input, matched: false, cardId: null, slug: null, name: null, setCode: null, collectorNumber: null, buyCents: null, buyStore: null, sellGuideCents: null })));
      }
      setProgress({ done: Math.min(i + CHUNK_SIZE, lines.length), total: lines.length });
      setResults([...out]);
    }
    setRunning(false);
  }

  function downloadCsv() {
    const header = "input,matched,name,set,number,buy_store,buy_price,sell_guide\n";
    const rows = results
      .map((r) =>
        [
          csvEscape(r.input),
          r.matched ? "yes" : "no",
          csvEscape(r.name ?? ""),
          csvEscape(r.setCode ?? ""),
          csvEscape(r.collectorNumber ?? ""),
          csvEscape(r.buyStore ?? ""),
          r.buyCents != null ? (r.buyCents / 100).toFixed(2) : "",
          r.sellGuideCents != null ? (r.sellGuideCents / 100).toFixed(2) : "",
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "opcompare-bulk-prices.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const totals = results.reduce(
    (acc, r) => {
      if (r.buyCents != null) { acc.buyCents += r.buyCents; acc.matchedBuy++; }
      if (r.sellGuideCents != null) { acc.sellCents += r.sellGuideCents; acc.matchedSell++; }
      return acc;
    },
    { buyCents: 0, sellCents: 0, matchedBuy: 0, matchedSell: 0 }
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Paste card names, one per line —\nCharizard ex\nPikachu VMAX\nRayquaza VSTAR\n..."}
          rows={8}
          className="input w-full font-mono text-xs"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="btn-ghost cursor-pointer text-sm">
            Upload CSV/TXT
            <input type="file" accept=".csv,.txt" onChange={onFile} className="hidden" />
          </label>
          <button onClick={run} disabled={running || !text.trim()} className="btn-primary text-sm">
            {running ? "Pricing…" : "Price this list"}
          </button>
          {results.length > 0 && (
            <button onClick={downloadCsv} className="btn-ghost text-sm">Download CSV</button>
          )}
        </div>
        {progress && (
          <div className="mt-2 text-xs text-slate-500">
            {progress.done} / {progress.total} lines priced{running ? "…" : ""}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Lines" value={String(results.length)} />
            <Stat label="Matched" value={String(results.filter((r) => r.matched).length)} />
            <Stat label="Cheapest-buy total" value={fmt(totals.buyCents)} sub={`${totals.matchedBuy} priced`} highlight />
            <Stat label="TCGplayer guide total" value={fmt(totals.sellCents)} sub={`${totals.matchedSell} priced`} />
          </div>
          <div className="card-surface max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-ink-800 bg-ink-900 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2">Input</th><th className="px-4 py-2">Matched card</th><th className="px-4 py-2 text-right">Cheapest buy</th><th className="px-4 py-2 text-right">Sell guide</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {results.map((r, i) => (
                  <tr key={i} className={r.matched ? "" : "opacity-60"}>
                    <td className="px-4 py-2 text-slate-400">{r.input}</td>
                    <td className="px-4 py-2">
                      {r.matched ? (
                        <Link href={`/card/${r.slug ?? r.cardId}`} className="font-semibold text-white hover:underline">
                          {r.name} <span className="text-[11px] text-slate-500">{r.setCode} · {r.collectorNumber}</span>
                        </Link>
                      ) : (
                        <span className="text-rose-400">no match</span>
                      )}
                    </td>
                    <td className="num px-4 py-2 text-right text-white">{r.buyCents != null ? fmt(r.buyCents) : "—"}</td>
                    <td className="num px-4 py-2 text-right text-slate-400">{r.sellGuideCents != null ? fmt(r.sellGuideCents) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function csvEscape(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="card-surface p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`num mt-0.5 text-lg font-bold ${highlight ? "text-accent" : "text-white"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}
