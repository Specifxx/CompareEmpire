"use client";

import { useEffect } from "react";
import { recordRecentView } from "./RecentlyViewed";

// Invisible beacon mounted on the card page: records the visit into the
// recently-viewed localStorage list. A separate component (instead of an effect
// inside the page) so the card page itself can stay a server component.
export function RecordView({
  slug,
  name,
  imageUrl,
  game,
  marketPriceCents,
}: {
  slug: string;
  name: string;
  imageUrl: string | null;
  game: string;
  marketPriceCents: number | null;
}) {
  useEffect(() => {
    recordRecentView({ slug, name, imageUrl, game, marketPriceCents });
  }, [slug, name, imageUrl, game, marketPriceCents]);

  return null;
}
