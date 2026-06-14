import { conditionInfo, domainInfo, rarityInfo } from "@/lib/constants";

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

export function DomainBadge({ domain }: { domain: string }) {
  const d = domainInfo(domain);
  return (
    <span
      className="chip"
      style={{ backgroundColor: hexWithAlpha(d.color, 0.18), color: d.color }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: d.color }}
      />
      {d.label}
    </span>
  );
}

export function RarityBadge({ rarity }: { rarity: string }) {
  const r = rarityInfo(rarity);
  return (
    <span
      className="chip"
      style={{ backgroundColor: hexWithAlpha(r.color, 0.16), color: r.color }}
    >
      {r.label}
    </span>
  );
}

// Compact rarity/feature flag for card tiles, so non-experts can spot the
// special printings at a glance (promos, illustration/alt-art, secret/rainbow/
// hyper "chase" cards). Basic rarities show nothing to avoid clutter.
const RARITY_TILE_LABEL: Record<string, string> = {
  Promo: "✦ Promo",
  "Illustration Rare": "✦ Illustration",
  "Special Illustration Rare": "✦✦ Special Illust.",
  "Rare Secret": "★ Secret",
  "Rare Rainbow": "★ Rainbow",
  "Hyper Rare": "★ Hyper",
  "Ultra Rare": "Ultra Rare",
  "Rare Ultra": "Ultra Rare",
  "Double Rare": "Double Rare",
  "Rare Holo VMAX": "VMAX",
  "Rare Holo VSTAR": "VSTAR",
  "Rare Holo V": "V",
  "Rare Holo GX": "GX",
  "Rare Holo EX": "EX",
  "Rare Shiny": "Shiny",
  "Amazing Rare": "Amazing",
  "Radiant Rare": "Radiant",
};
const PLAIN_RARITIES = new Set(["Common", "Uncommon", "Rare", "Rare Holo", ""]);
export function PokeRarityFlag({ rarity }: { rarity: string }) {
  if (PLAIN_RARITIES.has(rarity)) return null;
  const r = rarityInfo(rarity);
  const label = RARITY_TILE_LABEL[rarity] ?? r.label;
  return (
    <span
      className="chip text-[10px] font-bold shadow"
      style={{ backgroundColor: hexWithAlpha(r.color, 0.92), color: "#0a0c10" }}
    >
      {label}
    </span>
  );
}

export function ConditionBadge({ condition }: { condition: string }) {
  const c = conditionInfo(condition);
  return (
    <span
      className="chip"
      style={{ backgroundColor: hexWithAlpha(c.color, 0.16), color: c.color }}
      title={c.full}
    >
      {c.label}
    </span>
  );
}

export function VariantBadge({ variant }: { variant?: string | null }) {
  if (!variant) return null;
  return (
    <span
      className="chip font-semibold uppercase"
      style={{
        background: "linear-gradient(90deg,#f5a524,#f7c948)",
        color: "#1a1206",
      }}
      title={`Alternate art (${variant})`}
    >
      Alt {variant}
    </span>
  );
}

export function SignatureBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span
      className="chip font-semibold uppercase"
      style={{ background: "linear-gradient(90deg,#f59e0b,#b45309)", color: "#fff" }}
      title="Signature (artist-autographed overnumbered print)"
    >
      ✍ Signature
    </span>
  );
}

export function OvernumberedBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span
      className="chip font-semibold uppercase"
      style={{ background: "linear-gradient(90deg,#a855f7,#7c3aed)", color: "#fff" }}
      title="Overnumbered (secret/signature print beyond the set count)"
    >
      ★ Overnumbered
    </span>
  );
}

export function PromoBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span
      className="chip font-semibold uppercase"
      style={{ background: "linear-gradient(90deg,#06b6d4,#0891b2)", color: "#04222a" }}
      title="Promo printing"
    >
      ✦ Promo
    </span>
  );
}

export function FoilBadge() {
  return (
    <span
      className="chip font-semibold"
      style={{
        background:
          "linear-gradient(90deg,#ff0080,#ffea00,#00ffd5,#7a5cff,#ff0080)",
        color: "#0a0d13",
      }}
    >
      ✦ Foil
    </span>
  );
}
