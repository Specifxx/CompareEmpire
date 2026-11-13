import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BALL_DATA_URI } from "@/lib/logo-mark";
import { OG_SIZE } from "@/lib/og-card";
import { REGION_LIST } from "@/lib/regions";

// /og/upc: the Ultra-Premium Collection hub's share card (its og:image in every region), for a link post: the logo, the headline, and the
// two 30th Celebration boxes (Day and Night) drawn large on the right. No price and no count: Reddit, Discord and X cache a share image,
// so anything that changes would go stale. The art is the two product photos committed under public/upc/ (TCGplayer's, saved once) and
// read from disk: no database, no network. Drawn on its first request and kept by the CDN for a day.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INK = "#15171c";
const MUTED = "#5c606c";
const BRAND = "#d2300a";
const LINE = "#e4e3de";
const CDN = "public, s-maxage=86400, stale-while-revalidate=86400";

const font = (file: string) => readFileSync(join(process.cwd(), "src/app/fonts", file));
const art = (file: string) => `data:image/jpeg;base64,${readFileSync(join(process.cwd(), "public", "upc", file)).toString("base64")}`;

export function GET() {
  const day = art("day.jpg");
  const night = art("night.jpg");
  const box = { width: 470, borderRadius: 18, boxShadow: "0 24px 48px -12px rgba(24,22,18,0.4)", border: "3px solid #ffffff" };
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f6f6f3",
          backgroundImage: "radial-gradient(circle at 0% 0%, rgba(210,48,10,0.14), rgba(210,48,10,0) 45%), radial-gradient(circle at 90% 60%, rgba(255,203,5,0.30), rgba(255,203,5,0) 45%)",
          fontFamily: "Bricolage",
          color: INK,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600, padding: "52px 0 52px 60px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={BALL_DATA_URI} width={52} height={52} alt="" />
            <div style={{ display: "flex", fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>
              Dex<span style={{ color: BRAND }}>Compare</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignSelf: "flex-start", padding: "8px 18px", borderRadius: 999, background: "rgba(210,48,10,0.10)", border: `2px solid ${BRAND}`, color: BRAND, fontSize: 24, fontWeight: 800, letterSpacing: 2 }}>
              30TH CELEBRATION · DAY VS NIGHT
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
              <span style={{ fontSize: 72, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>Ultra-Premium</span>
              <span style={{ fontSize: 72, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05 }}>Collection</span>
              <span style={{ fontSize: 52, fontWeight: 800, color: BRAND, letterSpacing: -2, lineHeight: 1.2 }}>store prices</span>
            </div>
            <div style={{ display: "flex", marginTop: 16, fontSize: 27, fontWeight: 600, color: MUTED, lineHeight: 1.3 }}>Every UPC at every store, side by side.</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {REGION_LIST.map((r) => (
              <div key={r.region} style={{ display: "flex", padding: "6px 14px", borderRadius: 999, border: `2px solid ${LINE}`, background: "#ffffff", fontSize: 22, fontWeight: 600 }}>
                {r.short}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", position: "relative", width: 600, height: 630 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={night} alt="" width={box.width} style={{ position: "absolute", left: 90, top: 70, transform: "rotate(5deg)", ...box }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={day} alt="" width={box.width} style={{ position: "absolute", left: 20, top: 290, transform: "rotate(-4deg)", ...box }} />
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      headers: { "Cache-Control": "public, max-age=0", "Vercel-CDN-Cache-Control": CDN },
      fonts: [
        { name: "Bricolage", data: font("BricolageGrotesque-ExtraBold.ttf"), weight: 800, style: "normal" },
        { name: "Bricolage", data: font("BricolageGrotesque-SemiBold.ttf"), weight: 600, style: "normal" },
      ],
    },
  );
}
