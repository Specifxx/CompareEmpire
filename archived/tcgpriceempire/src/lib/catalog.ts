// Shared catalogue conventions — slug + search-text normalisation used by BOTH
// the importers and the UI, so a card's URL and search behaviour never drift
// between the two. Pure module (no DB / no next imports).

import type { GameKey } from "./games";

// URL-safe slug fragment.
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics (Pokémon → pokemon)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Canonical card slug: game + name + set + collector number / source id. The
// trailing identity segment guarantees uniqueness across reprints and alt arts.
export function cardSlug(game: GameKey, name: string, setName: string, identity: string): string {
  const parts = [game, slugify(name).slice(0, 60), slugify(setName).slice(0, 40), slugify(identity).slice(0, 20)];
  return parts.filter(Boolean).join("-").replace(/-+/g, "-").slice(0, 140);
}

// Normalised text for search matching: lowercase, no punctuation/spaces, so
// "Kai'Sa" matches "kaisa" and "Blue-Eyes" matches "blueeyes".
export function searchNorm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// The searchText column: normalized name + set name (so "charizard obsidian"
// style queries hit). Kept short — it's an indexed contains() target.
export function buildSearchText(name: string, setName: string): string {
  return `${searchNorm(name)} ${searchNorm(setName)}`.trim().slice(0, 200);
}
