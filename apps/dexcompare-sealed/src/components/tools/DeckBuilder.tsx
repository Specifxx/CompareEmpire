"use client";

import { useState } from "react";
import { checkDeck, DECK_SIZE, formatDeckList, isBasicEnergy, MAX_COPIES, parseDeckList, type DeckCard, type DeckSection } from "@/lib/tools";
import { Field, Figure, INPUT, ToolCard, useRemembered } from "./ui";

const SECTIONS: { key: DeckSection; title: string }[] = [
  { key: "pokemon", title: "Pokémon" },
  { key: "trainer", title: "Trainer" },
  { key: "energy", title: "Energy" },
];

export function DeckBuilder({ region }: { region: string }) {
  const [cards, setCards] = useRemembered<DeckCard[]>(`dex-tool-deck-${region}`, []);
  const [name, setName] = useState("");
  const [count, setCount] = useState("1");
  const [section, setSection] = useState<DeckSection>("pokemon");
  const [paste, setPaste] = useState("");
  const [unread, setUnread] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const check = checkDeck(cards);
  const over = new Set(check.overLimit.map((o) => o.name.toLowerCase()));

  const add = () => {
    const n = Math.max(1, Math.min(60, Math.floor(Number(count) || 1)));
    const nm = name.trim();
    if (!nm) return;
    const sec: DeckSection = isBasicEnergy(nm) ? "energy" : section;
    setCards((p) => {
      const i = p.findIndex((c) => c.section === sec && c.name.toLowerCase() === nm.toLowerCase() && !c.set);
      return i >= 0 ? p.map((c, j) => (j === i ? { ...c, count: c.count + n } : c)) : [...p, { section: sec, count: n, name: nm, set: "" }];
    });
    setName("");
    setCount("1");
  };
  const bump = (i: number, d: number) => setCards((p) => p.flatMap((c, j) => (j !== i ? [c] : c.count + d <= 0 ? [] : [{ ...c, count: c.count + d }])));
  const text = formatDeckList(cards);

  return (
    <ToolCard label="Deck builder">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_5rem_9rem_auto] sm:items-end"
      >
        <Field label="Card name">{(id) => <input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pikachu ex" className={INPUT} autoComplete="off" />}</Field>
        <Field label="Copies">{(id) => <input id={id} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} className={`${INPUT} text-center`} />}</Field>
        <Field label="Section">
          {(id) => (
            <select id={id} value={section} onChange={(e) => setSection(e.target.value as DeckSection)} className={INPUT}>
              {SECTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.title}
                </option>
              ))}
            </select>
          )}
        </Field>
        <button type="submit" className="btn-primary min-h-11 px-5">
          Add
        </button>
      </form>

      <div className="mt-6 grid gap-3 sm:grid-cols-4" aria-live="polite">
        <Figure label="Total" value={`${check.total} / ${DECK_SIZE}`} tone={check.total === DECK_SIZE ? "open" : check.total > DECK_SIZE ? "sold" : "ink"} sub={check.total === DECK_SIZE ? "Sixty: ready to check" : check.total > DECK_SIZE ? `${check.total - DECK_SIZE} over` : `${DECK_SIZE - check.total} to go`} />
        {SECTIONS.map((s) => (
          <Figure key={s.key} label={s.title} value={check.bySection[s.key]} />
        ))}
      </div>
      {check.overLimit.length > 0 && (
        <p className="mt-3 rounded-xl bg-sold-soft px-4 py-3 text-sm leading-6 text-sold" role="alert">
          Over the {MAX_COPIES}-copy limit: {check.overLimit.map((o) => `${o.name} (${o.count})`).join(", ")}.
        </p>
      )}
      {check.ok && <p className="mt-3 rounded-xl bg-open-soft px-4 py-3 text-sm font-semibold text-open">60 cards, nothing over four copies. Check format legality and one-per-deck cards before you play.</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {SECTIONS.map((s) => {
          const rows = cards.map((c, i) => ({ c, i })).filter(({ c }) => c.section === s.key);
          return (
            <div key={s.key} className="min-w-0">
              <h3 className="flex items-baseline justify-between font-display text-lg font-bold">
                {s.title} <span className="tabular text-sm text-muted">{check.bySection[s.key]}</span>
              </h3>
              {rows.length ? (
                <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                  {rows.map(({ c, i }) => (
                    <li key={i} className={`flex items-center gap-2 px-3 py-1.5 text-sm ${over.has(c.name.toLowerCase()) ? "bg-sold-soft/60" : ""}`}>
                      <span className="tabular w-6 shrink-0 text-right font-semibold">{c.count}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {c.name}
                        {c.set && <span className="ml-1.5 text-xs text-faint">{c.set}</span>}
                      </span>
                      <button type="button" onClick={() => bump(i, -1)} className="h-9 w-9 shrink-0 rounded-lg text-lg text-muted hover:bg-raised hover:text-ink" aria-label={`One fewer ${c.name}`}>
                        −
                      </button>
                      <button type="button" onClick={() => bump(i, 1)} className="h-9 w-9 shrink-0 rounded-lg text-lg text-muted hover:bg-raised hover:text-ink" aria-label={`One more ${c.name}`}>
                        +
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 rounded-xl border border-dashed border-line px-3 py-4 text-sm text-faint">No {s.title} cards yet.</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 border-t border-line pt-6 lg:grid-cols-2">
        <div>
          <Field label="Paste a deck list" hint="From Pokémon TCG Live or a deck site: a count, the card name, then the set code and number, under the headings Pokémon, Trainer and Energy.">
            {(id) => <textarea id={id} value={paste} onChange={(e) => setPaste(e.target.value)} rows={8} className={`${INPUT} h-auto py-2 font-mono text-sm`} placeholder={"Pokémon: 12\n4 Pikachu ex SSP 57\n…\nTrainer: 36\n4 Ultra Ball SVI 196\n…\nEnergy: 12\n12 Basic {L} Energy SVE 4"} />}
          </Field>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary min-h-11 px-5"
              onClick={() => {
                const parsed = parseDeckList(paste);
                setCards(parsed.cards);
                setUnread(parsed.unread);
              }}
            >
              Read list
            </button>
            <button
              type="button"
              className="btn-ghost min-h-11 px-4"
              onClick={() => {
                setCards([]);
                setUnread([]);
              }}
            >
              Clear deck
            </button>
          </div>
          {unread.length > 0 && (
            <p className="mt-3 text-sm leading-6 text-sold">
              {unread.length === 1 ? "One line" : `${unread.length} lines`} couldn’t be read: {unread.slice(0, 5).map((l) => `“${l}”`).join(", ")}
              {unread.length > 5 ? "…" : ""}
            </p>
          )}
        </div>
        <div>
          <div className="mb-1.5 text-sm font-semibold text-ink">Your list, ready to import</div>
          <pre className="max-h-72 min-h-[12rem] overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-raised p-3 font-mono text-xs leading-5">{text || "Add cards or paste a list."}</pre>
          <button
            type="button"
            disabled={!text}
            className="btn-ghost mt-3 min-h-11 px-4 disabled:opacity-50"
            onClick={() => {
              navigator.clipboard?.writeText(text).then(
                () => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                },
                () => setCopied(false),
              );
            }}
          >
            {copied ? "Copied" : "Copy list"}
          </button>
        </div>
      </div>
    </ToolCard>
  );
}
