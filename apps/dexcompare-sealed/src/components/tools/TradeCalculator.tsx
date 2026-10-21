"use client";

import { money } from "@/lib/format";
import { creditValue, parseMoney, parsePct, tradeResult, type TradeItem } from "@/lib/tools";
import { currencyPrefix, Figure, INPUT, NumberField, ToolCard, useRemembered } from "./ui";

interface Row {
  name: string;
  qty: string;
  value: string;
}

const blank = (): Row => ({ name: "", qty: "1", value: "" });
const toItems = (rows: Row[]): TradeItem[] => rows.map((r) => ({ name: r.name, qty: Math.max(0, Math.floor(Number(r.qty) || 0)), cents: parseMoney(r.value) ?? 0 }));

function Side({ title, rows, setRows, prefix, market }: { title: string; rows: Row[]; setRows: (f: (p: Row[]) => Row[]) => void; prefix: string; market: string }) {
  const total = toItems(rows).reduce((s, it) => s + it.qty * it.cents, 0);
  const edit = (i: number, k: keyof Row, v: string) => setRows((p) => p.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <fieldset className="min-w-0">
      <legend className="flex w-full items-baseline justify-between gap-3 font-display text-lg font-bold">
        <span>{title}</span>
        <span className="tabular text-base">{money(total, market)}</span>
      </legend>
      <ul className="mt-3 grid gap-2">
        {rows.map((r, i) => (
          <li key={i} className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-line pb-2 last:border-0 sm:grid-cols-[minmax(0,1fr)_4rem_7rem_auto] sm:border-0 sm:pb-0">
            <input aria-label={`${title}: item ${i + 1} name`} placeholder="Card or product" value={r.name} onChange={(e) => edit(i, "name", e.target.value)} className={`${INPUT} col-span-3 sm:col-span-1`} />
            <input aria-label={`${title}: item ${i + 1} quantity`} inputMode="numeric" value={r.qty} onChange={(e) => edit(i, "qty", e.target.value)} className={`${INPUT} text-center`} />
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">{prefix}</span>
              <input aria-label={`${title}: item ${i + 1} value of one`} inputMode="decimal" placeholder="0.00" value={r.value} onChange={(e) => edit(i, "value", e.target.value)} className={`${INPUT} pl-9`} />
            </div>
            <button type="button" onClick={() => setRows((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : [blank()]))} className="btn-ghost h-11 w-11 shrink-0 px-0" aria-label={`Remove item ${i + 1}`}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setRows((p) => [...p, blank()])} className="btn-ghost mt-3 min-h-11 px-4">
        + Add item
      </button>
    </fieldset>
  );
}

export function TradeCalculator({ region, market }: { region: string; market: string }) {
  const [give, setGive] = useRemembered<Row[]>(`dex-tool-trade-give-${region}`, [blank()]);
  const [get, setGet] = useRemembered<Row[]>(`dex-tool-trade-get-${region}`, [blank()]);
  const [credit, setCredit] = useRemembered<string>(`dex-tool-trade-credit-${region}`, "");
  const prefix = currencyPrefix(money(0, market));
  const res = tradeResult(toItems(give), toItems(get));
  const rate = parsePct(credit);
  const verdict =
    res.verdict === "empty"
      ? "Add values to both sides."
      : res.verdict === "even"
        ? "About even: within 2% of each other."
        : res.verdict === "you-gain"
          ? `You receive ${money(res.diffCents, market)} more (${res.diffPct.toFixed(1)}% of the bigger side).`
          : `You give ${money(-res.diffCents, market)} more (${res.diffPct.toFixed(1)}% of the bigger side).`;
  return (
    <ToolCard label="Trade calculator">
      <div className="grid gap-8 lg:grid-cols-2">
        <Side title="You give" rows={give} setRows={setGive} prefix={prefix} market={market} />
        <Side title="You get" rows={get} setRows={setGet} prefix={prefix} market={market} />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3" aria-live="polite">
        <Figure label="You give" value={money(res.giveCents, market)} />
        <Figure label="You get" value={money(res.getCents, market)} />
        <Figure label="Difference" value={money(Math.abs(res.diffCents), market)} tone={res.verdict === "you-give-more" ? "sold" : res.verdict === "you-gain" ? "open" : "ink"} sub={verdict} />
      </div>
      <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-end">
        <NumberField label="Store credit rate (optional)" value={credit} onChange={setCredit} suffix="%" placeholder="e.g. 70" />
        <p className="text-sm leading-6 text-muted">
          {rate != null && res.giveCents > 0 ? (
            <>
              At {rate}% store credit, what you give is worth <b className="tabular text-ink">{money(creditValue(res.giveCents, rate), market)}</b> in credit.
            </>
          ) : (
            "Trading cards in at a shop? Enter the shop's store-credit percentage to see what your side is worth as credit."
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          setGive([blank()]);
          setGet([blank()]);
          setCredit("");
        }}
        className="mt-5 text-sm font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
      >
        Clear both sides
      </button>
    </ToolCard>
  );
}
