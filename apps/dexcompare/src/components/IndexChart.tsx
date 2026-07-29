"use client";

import { useMemo, useState } from "react";

export interface IndexChartPoint {
  day: string;
  value: number;
}

const RANGES = [
  { key: "1M", days: 30 },
  { key: "3M", days: 90 },
  { key: "All", days: Infinity },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

// Dependency-free SVG line chart (no charting library in this app). Data is
// also rendered as a plain table below — chart data must be available as a
// table per the sprint's accessibility requirement, and it's a fine fallback
// for anyone who can't read the SVG.
export function IndexChart({ points }: { points: IndexChartPoint[] }) {
  const [range, setRange] = useState<RangeKey>("3M");
  const [showTable, setShowTable] = useState(false);

  const days = RANGES.find((r) => r.key === range)!.days;
  const sliced = useMemo(() => (Number.isFinite(days) ? points.slice(-days) : points), [points, days]);

  const { path, min, max } = useMemo(() => {
    if (sliced.length < 2) return { path: "", min: 0, max: 0 };
    const values = sliced.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const W = 600;
    const H = 160;
    const step = W / (sliced.length - 1);
    const path = sliced
      .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(H - ((p.value - min) / span) * H).toFixed(1)}`)
      .join(" ");
    return { path, min, max };
  }, [sliced]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                range === r.key ? "bg-brand-500/15 text-brand-300" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {r.key}
            </button>
          ))}
        </div>
        <button onClick={() => setShowTable((s) => !s)} className="text-xs text-slate-500 hover:text-slate-300">
          {showTable ? "Show chart" : "Show as table"}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-ink-800">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-ink-900 text-slate-500">
              <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Index value</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {sliced.map((p) => (
                <tr key={p.day}><td className="px-3 py-1.5 text-slate-400">{p.day}</td><td className="num px-3 py-1.5 text-slate-200">{p.value.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : sliced.length < 2 ? (
        <div className="grid h-40 place-items-center rounded-lg bg-ink-900/50 text-sm text-slate-500">
          Not enough history yet — check back after a few more daily snapshots.
        </div>
      ) : (
        <div className="rounded-lg bg-ink-900/50 p-3">
          <svg viewBox="0 0 600 160" className="w-full" preserveAspectRatio="none" role="img" aria-label="Index value over time">
            <path d={path} fill="none" stroke="#ff4d4d" strokeWidth="2" />
          </svg>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>{sliced[0]?.day}</span>
            <span className="num">low {min.toFixed(1)} · high {max.toFixed(1)}</span>
            <span>{sliced[sliced.length - 1]?.day}</span>
          </div>
        </div>
      )}
    </div>
  );
}
