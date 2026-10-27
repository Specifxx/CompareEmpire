"use client";

import { useState } from "react";
import { CardArt } from "./CardArt";

export interface CardImageData {
  name: string;
  domain: string;
  type: string;
  rarity: string;
  isPromo?: boolean;
  energyCost?: number | null;
  might?: number | null;
  collectorNumber?: string;
  artSeed?: number;
  orientation?: string | null;
  imageUrl?: string | null;
  imageThumbUrl?: string | null;
  blurDataUrl?: string | null;
}

interface Props {
  card: CardImageData;
  isFoil?: boolean;
  priority?: boolean; // LCP hint: the card page's hero image should not lazy-load
  full?: boolean; // use full-res image instead of the thumbnail
  className?: string;
}

function PromoStamp() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-1.5 z-20 flex justify-center">
      <span className="rounded-full bg-gradient-to-br from-amber-400 to-amber-600 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-950 shadow ring-1 ring-amber-300/50">
        Promo
      </span>
    </div>
  );
}

// Renders the real card image over a blurred backdrop. Falls back to the
// self-contained generated SVG art when no image is available OR when the image
// fails to load (so unverified/410'd CDN URLs never show a broken-image icon).
export function CardImage({ card, isFoil = false, full = false, priority = false, className }: Props) {
  const [failed, setFailed] = useState(false);
  const src = full
    ? card.imageUrl ?? card.imageThumbUrl
    : card.imageThumbUrl ?? card.imageUrl;

  if (!src || failed) {
    return (
      <div className={`relative ${className ?? ""}`}>
        <CardArt
          name={card.name}
          domain={card.domain}
          type={card.type}
          rarity={card.rarity}
          energyCost={card.energyCost}
          might={card.might}
          collectorNumber={card.collectorNumber}
          artSeed={card.artSeed ?? 1}
          isFoil={isFoil}
          className="h-full w-full"
        />
        {card.isPromo && <PromoStamp />}
      </div>
    );
  }

  const isLandscape = card.orientation === "landscape";

  return (
    <div
      className={`relative overflow-hidden rounded-lg ${className ?? ""}`}
      style={
        card.blurDataUrl
          ? { backgroundImage: `url(${card.blurDataUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { backgroundColor: "#080b11" }
      }
    >
      <div className="absolute inset-0 bg-ink-950/40" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={card.name}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        onError={() => setFailed(true)}
        className={`relative z-10 h-full w-full ${isLandscape ? "object-contain" : "object-cover"}`}
      />
      {isFoil && (
        <div
          className="pointer-events-none absolute inset-0 z-20 opacity-50 mix-blend-screen"
          style={{ background: "linear-gradient(115deg, #ff0080 0%, #ffea00 25%, #00ffd5 50%, #7a5cff 75%, #ff0080 100%)" }}
        />
      )}
      {card.isPromo && <PromoStamp />}
    </div>
  );
}
