"use client";

// The "Japanese edition" row on an English set page (lib/japanese-twins.ts): the Japanese twin set's lowest-priced open booster
// box (else pack) in this market, linked to its own page. Labelled a different product every time; never ranked against
// the English stores above, never given a best-price badge. Each tap is one `ja_edition` event (the 2 to 16 Dec test).
import Link from "next/link";
import { track } from "@vercel/analytics";

export function JapaneseEditionRow({
  href,
  enName,
  jaName,
  jaCode,
  productType,
  priceText,
  region,
}: {
  href: string;
  enName: string;
  jaName: string;
  jaCode: string;
  productType: string;
  priceText: string | null;
  region: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={() => track("ja_edition", { set: jaCode, region })}
      className="tile group mt-4 flex min-h-11 flex-wrap items-center justify-between gap-3 px-5 py-4"
      data-ja-edition={jaCode}
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Japanese edition</span>
        <span className="font-semibold">
          {jaName} {productType.replace(/^Japanese /, "").toLowerCase()}
          {priceText && (
            <>
              {" "}
              from <span className="tabular">{priceText}</span>
            </>
          )}
        </span>
        <span className="block text-sm text-muted">
          A different product from {enName}: the Japanese set it was built from, with its own card list, Japanese text and fewer cards a pack. Not compared
          with the English prices above.
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-brand">See the Japanese set →</span>
    </Link>
  );
}
