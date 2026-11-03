// Guide: phantasmal-flames-chase-cards (set guides, 2026-11-03). Built by set-reveal.tsx from REVEALS.me2, sourced there.
import type { RegionInfo } from "@/lib/regions";
import type { GuideData } from "./data";
import { GUIDE_BY_SLUG } from "./index";
import { REVEALS, revealBody, revealOutline } from "./set-reveal";

const GUIDE = GUIDE_BY_SLUG.get("phantasmal-flames-chase-cards")!;
export const outline = (r: RegionInfo, data: GuideData) => revealOutline(GUIDE, "chase", REVEALS.me2, r, data);
export const Body = revealBody(GUIDE, "chase", REVEALS.me2);
