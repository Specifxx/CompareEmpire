// Guide: 30th-celebration-chase-cards (set guides, 2026-11-03). Built by set-reveal.tsx from REVEALS.cel30, sourced there.
import type { RegionInfo } from "@/lib/regions";
import type { GuideData } from "./data";
import { GUIDE_BY_SLUG } from "./index";
import { REVEALS, revealBody, revealOutline } from "./set-reveal";

const GUIDE = GUIDE_BY_SLUG.get("30th-celebration-chase-cards")!;
export const outline = (r: RegionInfo, data: GuideData) => revealOutline(GUIDE, "chase", REVEALS.cel30, r, data);
export const Body = revealBody(GUIDE, "chase", REVEALS.cel30);
