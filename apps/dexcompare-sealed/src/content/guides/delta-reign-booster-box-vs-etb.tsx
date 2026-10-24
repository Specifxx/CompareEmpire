// Guide: Delta Reign booster box vs ETB (set-reveal guides, 2026-10-24). Built by set-reveal.tsx from REVEALS.me6, sourced there.
import type { RegionInfo } from "@/lib/regions";
import type { GuideData } from "./data";
import { GUIDE_BY_SLUG } from "./index";
import { REVEALS, revealBody, revealOutline } from "./set-reveal";

const GUIDE = GUIDE_BY_SLUG.get("delta-reign-booster-box-vs-etb")!;
export const outline = (r: RegionInfo, data: GuideData) => revealOutline(GUIDE, "box-vs-etb", REVEALS.me6, r, data);
export const Body = revealBody(GUIDE, "box-vs-etb", REVEALS.me6);
