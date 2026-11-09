// The product share card that draws the spread (2026-11-09): four stat tiles (cheapest, median, dearest, how many times more) over
// one bar per in-stock store, cheapest to dearest, with the median marked. It is the og:image of /<region>/p/<slug> where six or more
// stores have it in stock (app/og/p/[region]/[slug]); fewer draw the plain card. Real prices only, from the same offers the page shows.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BALL_DATA_URI } from "@/lib/logo-mark";
import { OG_SIZE } from "@/lib/og-card";

const INK = "#15171c";
const MUTED = "#5c606c";
const BRAND = "#d2300a";
const LINE = "#e4e3de";
const GREEN = "#147638";
const AMBER = "#e8a317";

const font = (file: string) => readFileSync(join(process.cwd(), "src/app/fonts", file));

export const STATS_MIN_STORES = 6;

export interface StatsCard {
  tag: string;
  name: string;
  /** In-stock store prices in cents, any order. */
  prices: number[];
  /** Formats cents in the region's currency. */
  fmt: (cents: number) => string;
  sub: string;
}

function mix(t: number): string {
  // green -> amber -> red along the sorted bars
  const a = t < 0.5 ? [20, 118, 56] : [232, 163, 23];
  const b = t < 0.5 ? [232, 163, 23] : [210, 48, 10];
  const k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(",")})`;
}

export function statsCard({ tag, name, prices, fmt, sub }: StatsCard): ImageResponse {
  const s = [...prices].sort((x, y) => x - y);
  const n = s.length;
  const lo = s[0];
  const hi = s[n - 1];
  const med = n % 2 ? s[(n - 1) / 2] : Math.round((s[n / 2 - 1] + s[n / 2]) / 2);
  const ratio = hi / lo;
  const H = 268; // bar area height in px
  const top = hi * 1.05;
  const medY = Math.round((med / top) * H);
  const tiles: [string, string, string][] = [
    ["CHEAPEST", fmt(lo), GREEN],
    ["MEDIAN", fmt(med), INK],
    ["DEAREST", fmt(hi), BRAND],
    ["DEAREST VS CHEAPEST", `${ratio.toFixed(1)}x`, AMBER],
  ];
  const title = name.length > 56 ? `${name.slice(0, 54)}…` : name;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f6f6f3", padding: "36px 48px", fontFamily: "Bricolage", color: INK }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={BALL_DATA_URI} width={44} height={44} alt="" />
          <div style={{ display: "flex", fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>
            Dex<span style={{ color: BRAND }}>Compare</span>
          </div>
          <div style={{ display: "flex", marginLeft: 6, padding: "3px 12px", borderRadius: 999, background: INK, color: "#ffffff", fontSize: 20, fontWeight: 600 }}>{tag}</div>
        </div>
        <div style={{ display: "flex", fontSize: title.length > 40 ? 38 : 46, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05, marginTop: 14 }}>{title}</div>
        <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
          {tiles.map(([label, value, color]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", flex: 1, padding: "10px 16px", borderRadius: 14, background: "#ffffff", border: `2px solid ${LINE}` }}>
              <div style={{ display: "flex", fontSize: 15, fontWeight: 600, color: MUTED, letterSpacing: 1 }}>{label}</div>
              <div style={{ display: "flex", fontSize: 38, fontWeight: 800, color, letterSpacing: -1 }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", position: "relative", alignItems: "flex-end", gap: 3, height: H, marginTop: 18, borderBottom: `2px solid ${LINE}` }}>
          <div style={{ display: "flex", position: "absolute", left: 0, right: 0, bottom: medY, borderTop: `2px dashed ${INK}` }} />
          {s.map((p, i) => (
            <div key={i} style={{ display: "flex", flex: 1, height: Math.max(4, Math.round((p / top) * H)), borderRadius: "3px 3px 0 0", background: mix(n > 1 ? i / (n - 1) : 0) }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 21, fontWeight: 600, color: MUTED }}>
          <div style={{ display: "flex" }}>{`${n} stores, cheapest to dearest · dashed line is the median`}</div>
          <div style={{ display: "flex" }}>{sub}</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Bricolage", data: font("BricolageGrotesque-ExtraBold.ttf"), weight: 800, style: "normal" },
        { name: "Bricolage", data: font("BricolageGrotesque-SemiBold.ttf"), weight: 600, style: "normal" },
      ],
    },
  );
}
