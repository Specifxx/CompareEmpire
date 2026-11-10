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
import * as blackFriday from "./pokemon-black-friday-2026";
import * as buildBattle from "./pokemon-build-and-battle-box";
import * as whereToBuyAu from "./where-to-buy-pokemon-cards-australia";
import * as megaEvolution from "./pokemon-mega-evolution-sealed-price-guide";
import * as chaosVsPerfect from "./pokemon-chaos-rising-vs-perfect-order";
import * as boxVsEtbValue from "./pokemon-booster-box-vs-etb-value";
import * as grading from "./is-pokemon-card-grading-worth-it";
import * as checkValue from "./how-to-check-pokemon-card-value";
import * as ebayVsAuStores from "./ebay-vs-australian-stores-pokemon-fees";
import * as marketWrap from "./pokemon-tcg-market-wrap";
import * as yearInSets from "./pokemon-tcg-2026-in-sets";
import * as cheapestBox from "./cheapest-pokemon-booster-box";
import * as boxPriceAu from "./pokemon-booster-box-price-australia";
import * as deltaReignBox from "./delta-reign-booster-box-price";
import * as phantasmalFlamesBox from "./phantasmal-flames-booster-box-price";
import * as destinedRivalsBox from "./destined-rivals-booster-box-price";
import * as blackBoltBox from "./black-bolt-booster-box-price";
import * as deltaReignChase from "./delta-reign-chase-cards";
import * as deltaReignList from "./delta-reign-card-list";
import * as deltaReignBoxVsEtb from "./delta-reign-booster-box-vs-etb";
import * as pitchBlackChase from "./pitch-black-chase-cards";
import * as bestEtbAu from "./best-pokemon-elite-trainer-boxes-australia";
import * as giftAu from "./pokemon-tcg-gift-guide-australia";
import * as giftXmas from "./pokemon-tcg-christmas-gift-guide";
import * as beginners from "./best-pokemon-tcg-product-for-beginners";
import * as g_flowing_fists_mega_lucario_z from "./flowing-fists-mega-lucario-z";
import * as g_30th_celebration_chase_cards from "./30th-celebration-chase-cards";
import * as g_chaos_rising_chase_cards from "./chaos-rising-chase-cards";
import * as g_perfect_order_chase_cards from "./perfect-order-chase-cards";
import * as g_ascended_heroes_chase_cards from "./ascended-heroes-chase-cards";
import * as g_phantasmal_flames_chase_cards from "./phantasmal-flames-chase-cards";
import * as g_mega_evolution_chase_cards from "./mega-evolution-chase-cards";
import * as g_pokemon_legendary_stadium_cards from "./pokemon-legendary-stadium-cards";
import * as g_every_mega_evolution_pokemon_ex from "./every-mega-evolution-pokemon-ex";

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
  "pokemon-black-friday-2026": blackFriday,
  "pokemon-build-and-battle-box": buildBattle,
  "where-to-buy-pokemon-cards-australia": whereToBuyAu,
  "pokemon-mega-evolution-sealed-price-guide": megaEvolution,
  "pokemon-chaos-rising-vs-perfect-order": chaosVsPerfect,
  "pokemon-booster-box-vs-etb-value": boxVsEtbValue,
  "is-pokemon-card-grading-worth-it": grading,
  "how-to-check-pokemon-card-value": checkValue,
  "ebay-vs-australian-stores-pokemon-fees": ebayVsAuStores,
  "pokemon-tcg-market-wrap": marketWrap,
  "pokemon-tcg-2026-in-sets": yearInSets,
  "cheapest-pokemon-booster-box": cheapestBox,
  "pokemon-booster-box-price-australia": boxPriceAu,
  "delta-reign-booster-box-price": deltaReignBox,
  "phantasmal-flames-booster-box-price": phantasmalFlamesBox,
  "destined-rivals-booster-box-price": destinedRivalsBox,
  "black-bolt-booster-box-price": blackBoltBox,
  "delta-reign-chase-cards": deltaReignChase,
  "delta-reign-card-list": deltaReignList,
  "delta-reign-booster-box-vs-etb": deltaReignBoxVsEtb,
  "pitch-black-chase-cards": pitchBlackChase,
  "best-pokemon-elite-trainer-boxes-australia": bestEtbAu,
  "pokemon-tcg-gift-guide-australia": giftAu,
  "pokemon-tcg-christmas-gift-guide": giftXmas,
  "best-pokemon-tcg-product-for-beginners": beginners,
  "flowing-fists-mega-lucario-z": g_flowing_fists_mega_lucario_z,
  "30th-celebration-chase-cards": g_30th_celebration_chase_cards,
  "chaos-rising-chase-cards": g_chaos_rising_chase_cards,
  "perfect-order-chase-cards": g_perfect_order_chase_cards,
  "ascended-heroes-chase-cards": g_ascended_heroes_chase_cards,
  "phantasmal-flames-chase-cards": g_phantasmal_flames_chase_cards,
  "mega-evolution-chase-cards": g_mega_evolution_chase_cards,
  "pokemon-legendary-stadium-cards": g_pokemon_legendary_stadium_cards,
  "every-mega-evolution-pokemon-ex": g_every_mega_evolution_pokemon_ex,
};
