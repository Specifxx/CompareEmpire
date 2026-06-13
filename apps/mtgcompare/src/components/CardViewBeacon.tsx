"use client";

import { useEffect } from "react";
import { recordRecentView } from "./RecentlyViewed";

// Records a card-page view (the page is ISR-cached, so a server-side counter would
// miss most visits). Fire-and-forget on mount. Also stores the card locally for
// the homepage "Recently viewed" strip.
export function CardViewBeacon({ idOrSlug, cardId }: { idOrSlug: string; cardId?: string }) {
  useEffect(() => {
    fetch(`/api/card/${idOrSlug}/view`, { method: "POST", keepalive: true }).catch(() => {});
    if (cardId) recordRecentView(cardId);
  }, [idOrSlug, cardId]);
  return null;
}
