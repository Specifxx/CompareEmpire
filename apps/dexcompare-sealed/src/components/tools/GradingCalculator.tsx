"use client";

import { money } from "@/lib/format";
import { gradingResult, parseMoney, parsePct } from "@/lib/tools";
import { currencyPrefix, Figure, INPUT, NumberField, ToolCard, useRemembered } from "./ui";

interface GradeRow {
  label: string;
  sale: string;
  chance: string;
}

interface State {
  raw: string;
  fee: string;
  shipping: string;
  sellFee: string;
  grades: GradeRow[];
}

const START: State = {
  raw: "",
  fee: "",
  shipping: "",
  sellFee: "13",
  grades: [
    { label: "Grade 10", sale: "", chance: "" },
    { label: "Grade 9", sale: "", chance: "" },
    { label: "Grade 8 or lower", sale: "", chance: "" },
  ],
};

export function GradingCalculator({ region, market }: { region: string; market: string }) {
  const [st, setSt] = useRemembered<State>(`dex-tool-grading-${region}`, START);
  const m = (c: number) => money(c, market);
  const prefix = currencyPrefix(m(0));
  const set = (k: Exclude<keyof State, "grades">) => (v: string) => setSt((p) => ({ ...p, [k]: v }));
  const editGrade = (i: number, k: keyof GradeRow, v: string) => setSt((p) => ({ ...p, grades: p.grades.map((g, j) => (j === i ? { ...g, [k]: v } : g)) }));
  const res = gradingResult({
    rawCents: parseMoney(st.raw) ?? 0,
    gradingFeeCents: parseMoney(st.fee) ?? 0,
    shippingCents: parseMoney(st.shipping) ?? 0,
    sellFeePct: parsePct(st.sellFee) ?? 0,
    grades: st.grades.map((g) => ({ label: g.label, saleCents: parseMoney(g.sale) ?? 0, chancePct: parsePct(g.chance) ?? 0 })),
  });
  const filled = st.raw.trim() !== "" && st.grades.some((g) => g.sale.trim() !== "");
  const signed = (c: number) => `${c > 0 ? "+" : c < 0 ? "−" : ""}${m(Math.abs(c))}`;

  return (
    <ToolCard label="Grading value calculator">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Sells for ungraded (raw)" value={st.raw} onChange={set("raw")} prefix={prefix} hint="Recent sold listings for this card, same condition." />
        <NumberField label="Selling fee rate" value={st.sellFee} onChange={set("sellFee")} suffix="%" hint="The marketplace's fee on a sale, raw or graded." />
        <NumberField label="Grading fee" value={st.fee} onChange={set("fee")} prefix={prefix} hint="Your grader's price for this card's tier." />
        <NumberField label="Postage and insurance, both ways" value={st.shipping} onChange={set("shipping")} prefix={prefix} />
      </div>

      <fieldset className="mt-6">
        <legend className="font-display text-lg font-bold">The grades you could get</legend>
        <p className="mt-1 text-sm text-muted">What the card sells for in each grade, and how likely you think each one is.</p>
        <ul className="mt-3 grid gap-3">
          {st.grades.map((g, i) => {
            const line = res.lines[i];
            return (
              <li key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-line p-3 sm:grid-cols-[minmax(0,1fr)_9rem_6rem_9rem] sm:items-center">
                <input aria-label={`Grade ${i + 1} name`} value={g.label} onChange={(e) => editGrade(i, "label", e.target.value)} className={`${INPUT} col-span-2 sm:col-span-1`} />
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">{prefix}</span>
                  <input aria-label={`${g.label}: sells for`} inputMode="decimal" placeholder="Sells for" value={g.sale} onChange={(e) => editGrade(i, "sale", e.target.value)} className={`${INPUT} pl-9`} />
                </div>
                <div className="relative">
                  <input aria-label={`${g.label}: chance`} inputMode="decimal" placeholder="Chance" value={g.chance} onChange={(e) => editGrade(i, "chance", e.target.value)} className={`${INPUT} pr-7`} />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
                </div>
                <div className={`tabular col-span-2 text-sm font-semibold sm:col-span-1 sm:text-right ${!filled || !g.sale ? "text-faint" : line.vsRawCents >= 0 ? "text-open" : "text-sold"}`} aria-live="polite">
                  {filled && g.sale ? `${signed(line.vsRawCents)} vs raw` : "—"}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setSt((p) => ({ ...p, grades: [...p.grades, { label: "Another grade", sale: "", chance: "" }] }))} className="btn-ghost min-h-11 px-4">
            + Add a grade
          </button>
          {st.grades.length > 1 && (
            <button type="button" onClick={() => setSt((p) => ({ ...p, grades: p.grades.slice(0, -1) }))} className="btn-ghost min-h-11 px-4">
              Remove the last
            </button>
          )}
          <button type="button" onClick={() => setSt(START)} className="min-h-11 px-2 text-sm font-semibold text-muted hover:text-ink hover:underline">
            Start again
          </button>
        </div>
      </fieldset>

      <div className="mt-6 grid gap-3 sm:grid-cols-3" aria-live="polite">
        <Figure label="Selling raw leaves" value={st.raw ? m(res.rawNetCents) : "—"} sub="After the selling fee" />
        <Figure label="Break-even graded price" value={st.raw && res.breakEvenCents != null ? m(res.breakEvenCents) : "—"} tone="brand" sub="Below this, grading leaves you less than selling raw" />
        <Figure
          label="Weighted average"
          value={filled && res.weightedVsRawCents != null ? signed(res.weightedVsRawCents) : "—"}
          tone={!filled || res.weightedVsRawCents == null ? "ink" : res.weightedVsRawCents >= 0 ? "open" : "sold"}
          sub={
            res.chanceTotalPct > 0 && Math.round(res.chanceTotalPct) !== 100
              ? `Your chances add up to ${Math.round(res.chanceTotalPct)}%; they are scaled to 100%.`
              : "Each grade's result, weighted by your chances, against selling raw"
          }
        />
      </div>
    </ToolCard>
  );
}
