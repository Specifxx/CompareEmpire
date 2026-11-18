import { retiredCardResponse } from "@/lib/retired-cards";

// /card and /card/<anything>: the old singles site's card pages, 410 Gone (lib/retired-cards.ts). Edge, no data read; the CDN
// keeps each answer a day.
export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET(): Response {
  return retiredCardResponse("GET");
}

export function HEAD(): Response {
  return retiredCardResponse("HEAD");
}
