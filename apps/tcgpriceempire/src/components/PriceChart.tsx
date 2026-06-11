import { formatMoney } from "@/lib/format";
import type { PricePoint } from "@/lib/history";

// All history is UTC-midnight day snapshots, so timestamps are derived at UTC
// to keep the x-axis stable regardless of the server's timezone.
function dayTime(day: string): number {
  return new Date(`${day}T00:00:00Z`).getTime();
}

function fmtDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });
}

// Percent change between the latest point and the recorded point closest to
// `daysBack` days earlier. null until enough history spans that window.
export function changeOver(points: PricePoint[], daysBack: number): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const lastT = dayTime(last.day);
  const target = lastT - daysBack * 86400_000;
  // Only points at least ~1 day older than the latest qualify as a baseline.
  const earlier = points.filter((p) => dayTime(p.day) <= lastT - 86400_000 / 2);
  if (!earlier.length) return null;
  const base = earlier.reduce((best, p) =>
    Math.abs(dayTime(p.day) - target) < Math.abs(dayTime(best.day) - target) ? p : best
  );
  if (base.priceCents <= 0) return null;
  return ((last.priceCents - base.priceCents) / base.priceCents) * 100;
}

function ChangeChip({ label, pct }: { label: string; pct: number | null }) {
  if (pct == null) return null;
  const up = pct > 0;
  const flat = Math.abs(pct) < 0.05;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
        flat ? "bg-ink-800 text-slate-400" : up ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
      }`}
    >
      {label} {flat ? "—" : `${up ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}%`}
    </span>
  );
}

// Static SVG market-price trend chart (server-rendered, no client JS, no chart
// dependency). Plots the daily USD market-price snapshots; renders nothing
// until two days of history exist, so fresh cards just skip the section.
export function PriceChart({
  points,
  title = "Market price history",
  note,
}: {
  points: PricePoint[];
  title?: string;
  note?: string;
}) {
  if (points.length < 2) return null;

  const fmt = (c: number) => formatMoney(c, "USD");

  const W = 640;
  const H = 180;
  const PAD = { l: 8, r: 8, t: 12, b: 22 };
  const min = Math.min(...points.map((p) => p.priceCents));
  const max = Math.max(...points.map((p) => p.priceCents));
  const span = Math.max(max - min, Math.max(1, Math.round(max * 0.04))); // flat lines still get a visible band
  const t0 = dayTime(points[0].day);
  const t1 = dayTime(points[points.length - 1].day);
  const x = (t: number) => PAD.l + ((t - t0) / Math.max(t1 - t0, 1)) * (W - PAD.l - PAD.r);
  const y = (c: number) => PAD.t + (1 - (c - min) / span) * (H - PAD.t - PAD.b);

  const coords = points.map((p) => [x(dayTime(p.day)), y(p.priceCents)] as const);
  const line = coords.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${H - PAD.b} L${coords[0][0].toFixed(1)},${H - PAD.b} Z`;

  const last = points[points.length - 1];
  const wk = changeOver(points, 7);
  const mo = changeOver(points, 30);

  return (
    <div className="card-surface mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-700 p-4">
        <div>
          <h2 className="font-bold text-white">{title}</h2>
          {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
        </div>
        <div className="flex items-center gap-2">
          <ChangeChip label="7d" pct={wk} />
          <ChangeChip label="30d" pct={mo} />
          <span className="text-sm font-bold text-white">{fmt(last.priceCents)}</span>
        </div>
      </div>
      <div className="p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Price trend from ${fmt(points[0].priceCents)} to ${fmt(last.priceCents)}`}
        >
          <defs>
            {/* Imperial purple, fading out — matches the brand accent. */}
            <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#pc-fill)" />
          <path d={line} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {/* Latest point gets the gold dot — it's the number the page headlines. */}
          <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r="3.5" fill="#fbbf24" />
          {/* x-axis range labels */}
          <text x={PAD.l} y={H - 6} fill="#64748b" fontSize="11">{fmtDay(points[0].day)}</text>
          <text x={W - PAD.r} y={H - 6} fill="#64748b" fontSize="11" textAnchor="end">{fmtDay(last.day)}</text>
        </svg>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
          <span>Low {fmt(min)}</span>
          <span>{points.length} daily snapshots</span>
          <span>High {fmt(max)}</span>
        </div>
      </div>
    </div>
  );
}
