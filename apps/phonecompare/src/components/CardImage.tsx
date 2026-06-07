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

// Clean phone-shaped placeholder when a product photo isn't available — looks
// like a phone, not a trading card.
function PhonePlaceholder({ name }: { name: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-ink-800 to-ink-900 p-4 text-center">
      <svg viewBox="0 0 48 48" className="h-16 w-16 opacity-70" fill="none">
        <rect x="16" y="7" width="16" height="34" rx="3.5" fill="#2b3344" stroke="#475569" strokeWidth="1.5" />
        <rect x="18.5" y="11" width="11" height="24" rx="1.5" fill="#0b0f16" stroke="#64748b" strokeWidth="1" />
        <rect x="21.5" y="8.6" width="5" height="1" rx="0.5" fill="#64748b" />
        <circle cx="24" cy="38" r="1.2" fill="#64748b" />
      </svg>
      <span className="line-clamp-2 text-xs font-medium text-slate-400">{name}</span>
    </div>
  );
}

// Renders the real phone product photo (contained on a clean light backdrop so
// the whole body is visible). Falls back to a phone placeholder when missing.
export function CardImage({ card, full = false, className }: Props) {
  const src = full
    ? card.imageUrl ?? card.imageThumbUrl
    : card.imageThumbUrl ?? card.imageUrl;

  if (!src) {
    return (
      <div className={`relative overflow-hidden rounded-lg ${className ?? ""}`}>
        <PhonePlaceholder name={card.name} />
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
