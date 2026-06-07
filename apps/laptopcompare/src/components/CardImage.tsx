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

// Clean laptop-shaped placeholder when a product photo isn't available — looks
// like a laptop, not a trading card.
function LaptopPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-ink-800 to-ink-900 p-4 text-center">
      <svg viewBox="0 0 48 48" className="h-16 w-16 opacity-70" fill="none">
        <rect x="11" y="13" width="26" height="17" rx="2" fill="#2b3344" stroke="#475569" strokeWidth="1.5" />
        <rect x="13.5" y="15.5" width="21" height="12" rx="1" fill="#0b0f16" stroke="#64748b" strokeWidth="1" />
        <path d="M7 33 H41 L43 36.5 H5 Z" fill="#2b3344" stroke="#475569" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
      <span className="line-clamp-2 text-xs font-medium text-slate-400">{name}</span>
    </div>
  );
}

// Renders the real laptop product photo (contained on a clean light backdrop so
// the whole body is visible). Falls back to a laptop placeholder when missing.
export function CardImage({ card, full = false, className }: Props) {
  const src = full
    ? card.imageUrl ?? card.imageThumbUrl
    : card.imageThumbUrl ?? card.imageUrl;

  if (!src) {
    return (
      <div className={`relative overflow-hidden rounded-lg ${className ?? ""}`}>
        <LaptopPlaceholder name={card.name} />
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
