import { formatMoney } from "@/lib/format";

export interface PricePoint {
  day: Date;
  cents: number;
}

// Percent change between the latest point and the recorded point closest to
// `daysBack` days earlier. null until enough history spans that window.
export function changeOver(points: PricePoint[], daysBack: number): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const target = last.day.getTime() - daysBack * 86400_000;
  // Only points at least ~1 day older than the latest qualify as a baseline.
  const earlier = points.filter((p) => p.day.getTime() <= last.day.getTime() - 86400_000 / 2);
  if (!earlier.length) return null;
  const base = earlier.reduce((best, p) => (Math.abs(p.day.getTime() - target) < Math.abs(best.day.getTime() - target) ? p : best));
  if (base.cents <= 0) return null;
  return ((last.cents - base.cents) / base.cents) * 100;
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
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

// Static SVG price-trend chart (server-rendered, no client JS). Plots the daily
// cheapest-price snapshots; the snapshots are AU-market, so callers label the
// section accordingly for other markets.
export function PriceChart({ points, title, note }: { points: PricePoint[]; title: string; note?: string }) {
  if (points.length === 0) return null;

  const fmt = (c: number) => formatMoney(c, "AUD");

  if (points.length === 1) {
    return (
      <div className="card-surface mt-6 p-5">
        <h2 className="font-bold text-white">{title}</h2>
        <p className="mt-2 text-sm text-slate-400">
          Price tracking started {fmtDay(points[0].day)} at <span className="font-semibold text-white">{fmt(points[0].cents)}</span>.
          The trend chart appears once a few days of history build up — we snapshot the cheapest price every day.
        </p>
      </div>
    );
  }

  const W = 640;
  const H = 180;
  const PAD = { l: 8, r: 8, t: 12, b: 22 };
  const min = Math.min(...points.map((p) => p.cents));
  const max = Math.max(...points.map((p) => p.cents));
  const span = Math.max(max - min, Math.max(1, Math.round(max * 0.04))); // flat lines still get a visible band
  const t0 = points[0].day.getTime();
  const t1 = points[points.length - 1].day.getTime();
  const x = (t: number) => PAD.l + ((t - t0) / Math.max(t1 - t0, 1)) * (W - PAD.l - PAD.r);
  const y = (c: number) => PAD.t + (1 - (c - min) / span) * (H - PAD.t - PAD.b);

  const coords = points.map((p) => [x(p.day.getTime()), y(p.cents)] as const);
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
          <span className="text-sm font-bold text-white">{fmt(last.cents)}</span>
        </div>
      </div>
      <div className="p-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Price trend from ${fmt(points[0].cents)} to ${fmt(last.cents)}`}>
          <defs>
            <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#pc-fill)" />
          <path d={line} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r="3.5" fill="#38bdf8" />
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
