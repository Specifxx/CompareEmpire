"use client";

import { useState } from "react";

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
  full?: boolean; // use full-res image instead of the thumbnail
  className?: string;
}

// Clean camera-shaped placeholder when a product photo isn't available — looks
// like a camera, not a trading card.
function CameraPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-50 to-white p-4 text-center">
      <svg viewBox="0 0 48 48" className="h-16 w-16 opacity-70" fill="none">
        <rect x="6" y="15" width="36" height="24" rx="4" fill="#2b3344" stroke="#475569" strokeWidth="1.5" />
        <path d="M17 15l2.5-4h9L31 15z" fill="#2b3344" stroke="#475569" strokeWidth="1.5" />
        <circle cx="24" cy="27" r="8" fill="#0b0f16" stroke="#64748b" strokeWidth="1.5" />
        <circle cx="24" cy="27" r="4.5" fill="#334155" />
        <rect x="34" y="18" width="4" height="3" rx="1" fill="#fbbf24" />
      </svg>
      <span className="line-clamp-2 text-xs font-medium text-slate-600">{name}</span>
    </div>
  );
}

// Renders the real camera product photo (contained on a clean light backdrop so
// the whole body is visible). Falls back to a camera placeholder when missing.
export function CardImage({ card, full = false, className }: Props) {
  const [failed, setFailed] = useState(false);
  const src = full
    ? card.imageUrl ?? card.imageThumbUrl
    : card.imageThumbUrl ?? card.imageUrl;

  if (!src || failed) {
    return (
      <div className={`relative overflow-hidden rounded-lg ${className ?? ""}`}>
        <CameraPlaceholder name={card.name} />
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-lg bg-white ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={card.name}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="relative z-10 h-full w-full object-contain p-2"
      />
    </div>
  );
}
