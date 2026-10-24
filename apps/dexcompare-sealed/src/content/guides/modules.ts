// Each guide's body module, by slug: what /[region]/guides/[slug] renders. Kept apart from the registry (index.ts), which the
// sitemap imports and which must stay free of React and the database.
import type { GuideSlug } from "./index";
import type { GuideModule } from "./kit";
import * as areBoxesWorthIt from "./are-pokemon-booster-boxes-worth-it";
import * as boxVsEtbVsBundle from "./booster-box-vs-etb-vs-booster-bundle";
import * as howManyPacks from "./how-many-packs-in-pokemon-products";
import * as preorder from "./how-to-preorder-pokemon-tcg";
import * as explained from "./pokemon-sealed-products-explained";
import * as msrp from "./pokemon-tcg-msrp";
import * as etb from "./whats-in-a-pokemon-elite-trainer-box";
import * as pcEtb from "./pokemon-center-etb-vs-elite-trainer-box";
import * as cheapest from "./cheapest-way-to-buy-pokemon-packs";
import * as whereToBuy from "./where-to-buy-pokemon-cards-online";
import * as resealed from "./how-to-avoid-resealed-pokemon-products";
import * as buildBattle from "./pokemon-build-and-battle-box";
import * as whereToBuyAu from "./where-to-buy-pokemon-cards-australia";
import * as megaEvolution from "./pokemon-mega-evolution-sealed-price-guide";
import * as chaosVsPerfect from "./pokemon-chaos-rising-vs-perfect-order";
import * as boxVsEtbValue from "./pokemon-booster-box-vs-etb-value";
import * as grading from "./is-pokemon-card-grading-worth-it";
import * as checkValue from "./how-to-check-pokemon-card-value";
import * as ebayVsAuStores from "./ebay-vs-australian-stores-pokemon-fees";
import * as marketWrap from "./pokemon-tcg-market-wrap";
import * as cheapestBox from "./cheapest-pokemon-booster-box";
import * as boxPriceAu from "./pokemon-booster-box-price-australia";
import * as deltaReignBox from "./delta-reign-booster-box-price";
import * as deltaReignChase from "./delta-reign-chase-cards";
import * as deltaReignList from "./delta-reign-card-list";
import * as deltaReignBoxVsEtb from "./delta-reign-booster-box-vs-etb";
import * as pitchBlackChase from "./pitch-black-chase-cards";

export const GUIDE_MODULES: Record<GuideSlug, GuideModule> = {
  "how-many-packs-in-pokemon-products": howManyPacks,
  "booster-box-vs-etb-vs-booster-bundle": boxVsEtbVsBundle,
  "are-pokemon-booster-boxes-worth-it": areBoxesWorthIt,
  "pokemon-sealed-products-explained": explained,
  "pokemon-tcg-msrp": msrp,
  "how-to-preorder-pokemon-tcg": preorder,
  "whats-in-a-pokemon-elite-trainer-box": etb,
  "pokemon-center-etb-vs-elite-trainer-box": pcEtb,
  "cheapest-way-to-buy-pokemon-packs": cheapest,
  "where-to-buy-pokemon-cards-online": whereToBuy,
  "how-to-avoid-resealed-pokemon-products": resealed,
  "pokemon-build-and-battle-box": buildBattle,
  "where-to-buy-pokemon-cards-australia": whereToBuyAu,
  "pokemon-mega-evolution-sealed-price-guide": megaEvolution,
  "pokemon-chaos-rising-vs-perfect-order": chaosVsPerfect,
  "pokemon-booster-box-vs-etb-value": boxVsEtbValue,
  "is-pokemon-card-grading-worth-it": grading,
  "how-to-check-pokemon-card-value": checkValue,
  "ebay-vs-australian-stores-pokemon-fees": ebayVsAuStores,
  "pokemon-tcg-market-wrap": marketWrap,
  "cheapest-pokemon-booster-box": cheapestBox,
  "pokemon-booster-box-price-australia": boxPriceAu,
  "delta-reign-booster-box-price": deltaReignBox,
  "delta-reign-chase-cards": deltaReignChase,
  "delta-reign-card-list": deltaReignList,
  "delta-reign-booster-box-vs-etb": deltaReignBoxVsEtb,
  "pitch-black-chase-cards": pitchBlackChase,
};
