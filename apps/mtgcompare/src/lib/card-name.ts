// Card display name with its printing "credentials" baked in.
//
// Several printings share the SAME name AND collector number — a promo vs its
// base card, an alt-art vs the regular print — so showing just the name + number
// makes them indistinguishable in search and lists. These helpers append
// human-readable credentials (Promo, Alt Art, Secret/Overnumbered) to the name so
// the distinction is visible in the title itself, not only in the floating badges.

import { isSignature, isOvernumbered } from "@/lib/constants";

export interface CardCredentialFields {
  variant?: string | null;
  isPromo?: boolean | null;
  rarity?: string | null;
  collectorNumber?: string | null;
}

// Credential tags for a card, most distinctive first. Empty for a plain base card.
export function cardCredentials(c: CardCredentialFields): string[] {
  const out: string[] = [];
  if (c.variant) out.push("Alt Art");
  // Special print run markers from the collector number.
  if (c.collectorNumber && isSignature(c.collectorNumber)) out.push("Signature");
  else if (c.collectorNumber && isOvernumbered(c.collectorNumber)) out.push("Secret");
  // Promo printing — often shares the base card's artwork.
  if (c.isPromo) out.push("Promo");
  return out;
}

// "Pikachu (Promo)" / "Charizard ex (Secret)" / plain "Snorlax" when base.
export function cardDisplayName(name: string, c: CardCredentialFields): string {
  const creds = cardCredentials(c);
  return creds.length ? `${name} (${creds.join(", ")})` : name;
}
