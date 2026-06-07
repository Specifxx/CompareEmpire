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

// Clean car-shaped placeholder when a vehicle photo isn't available.
function CarPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-ink-800 to-ink-900 p-4 text-center">
      <svg viewBox="0 0 48 48" className="h-16 w-16 opacity-70" fill="none">
        <path d="M6 30 L9 22 C10 19 12 18 15 18 H30 C33 18 35 19 37 22 L42 28 V32 H6 Z" fill="#2b3344" stroke="#475569" strokeWidth="1.5" />
        <path d="M14 18 L16 13 H27 L31 18 Z" fill="#1b2330" stroke="#475569" strokeWidth="1" />
        <circle cx="15" cy="32" r="4.5" fill="#0b0f16" stroke="#64748b" strokeWidth="1.5" />
        <circle cx="33" cy="32" r="4.5" fill="#0b0f16" stroke="#64748b" strokeWidth="1.5" />
        <rect x="38" y="24" width="4" height="3" rx="1" fill="#fbbf24" />
      </svg>
      <span className="line-clamp-2 text-xs font-medium text-slate-400">{name}</span>
    </div>
  );
}

// Renders the real car product photo (contained on a clean light backdrop so
// the whole body is visible). Falls back to a car placeholder when missing.
export function CardImage({ card, full = false, className }: Props) {
  const src = full
    ? card.imageUrl ?? card.imageThumbUrl
    : card.imageThumbUrl ?? card.imageUrl;

  if (!src) {
    return (
      <div className={`relative overflow-hidden rounded-lg ${className ?? ""}`}>
        <CarPlaceholder name={card.name} />
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
        className="relative z-10 h-full w-full object-contain p-2"
      />
    </div>
  );
}
