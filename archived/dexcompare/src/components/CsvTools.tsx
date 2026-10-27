"use client";

import { useRef, useState } from "react";
import { setQty, getQty, setCostBasis } from "@/lib/collection-client";
import { dollarsToCents } from "@/lib/format";
import { useCountry } from "./CountryProvider";

// One row of the current collection, for CSV export.
export interface ExportRow {
  cardId: string;
  name: string;
  setCode: string;
  collectorNumber: string;
  qty: number;
  unitCostCents: number | null;
  costCurrency: string | null;
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// Minimal CSV parser — handles quoted fields, escaped quotes ("") and CRLF. Good
// enough for spreadsheet exports; not a full RFC 4180 implementation.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function CsvTools({ exportRows }: { exportRows: ExportRow[] }) {
  const { currency } = useCountry();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function doExport() {
    const header = "name,setCode,collectorNumber,qty,unitCost,currency,cardId";
    const lines = exportRows.map((r) =>
      [
        r.name,
        r.setCode,
        r.collectorNumber,
        String(r.qty),
        r.unitCostCents != null ? (r.unitCostCents / 100).toFixed(2) : "",
        r.costCurrency ?? "",
        r.cardId,
      ]
        .map((c) => csvEscape(String(c)))
        .join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dexcompare-collection.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(file: File) {
    setBusy(true);
    setMsg("Reading file…");
    try {
      const grid = parseCsv(await file.text());
      if (grid.length < 2) {
        setMsg("That file has no data rows.");
        return;
      }
      const header = grid[0].map((h) => h.trim().toLowerCase());
      const idx = (names: string[]) => {
        for (const n of names) {
          const i = header.indexOf(n);
          if (i >= 0) return i;
        }
        return -1;
      };
      const iSet = idx(["setcode", "set", "set code"]);
      const iNum = idx(["collectornumber", "number", "card number", "collector number", "no", "no."]);
      const iQty = idx(["qty", "quantity", "count", "owned"]);
      const iCost = idx(["unitcost", "cost", "price paid", "paid", "unit cost", "cost per"]);
      const iCur = idx(["currency", "cur"]);
      const iId = idx(["cardid", "id"]);

      if (iId < 0 && (iSet < 0 || iNum < 0)) {
        setMsg("CSV needs either a cardId column, or both setCode and collectorNumber columns.");
        return;
      }

      // Accumulate per card so duplicate rows for the same card add up.
      type Pending = { qty: number; unitCents: number | null; currency: string };
      const bySetNum = new Map<string, Pending>(); // "SET|NUM" -> pending (needs resolve)
      const byId = new Map<string, Pending>(); // cardId -> pending (already resolved)

      for (const r of grid.slice(1)) {
        const qty = iQty >= 0 ? Math.max(1, Math.floor(Number(r[iQty]) || 1)) : 1;
        const costRaw = iCost >= 0 ? (r[iCost] ?? "").trim() : "";
        const unitCents = costRaw ? dollarsToCents(costRaw) : null;
        const cur = (iCur >= 0 ? (r[iCur] ?? "").trim().toUpperCase() : "") || currency;
        const id = iId >= 0 ? (r[iId] ?? "").trim() : "";
        if (id) {
          const p = byId.get(id) ?? { qty: 0, unitCents: null, currency: cur };
          p.qty += qty;
          if (unitCents != null) p.unitCents = unitCents;
          byId.set(id, p);
        } else {
          const set = (r[iSet] ?? "").trim();
          const num = (r[iNum] ?? "").trim();
          if (!set || !num) continue;
          const k = `${set.toUpperCase()}|${num.toUpperCase()}`;
          const p = bySetNum.get(k) ?? { qty: 0, unitCents: null, currency: cur };
          p.qty += qty;
          if (unitCents != null) p.unitCents = unitCents;
          bySetNum.set(k, p);
        }
      }

      // Resolve the set+number rows to card ids server-side (capped at 500).
      let unmatched = 0;
      if (bySetNum.size) {
        setMsg("Matching cards…");
        const rows = [...bySetNum.keys()].slice(0, 500).map((k) => {
          const [setCode, collectorNumber] = k.split("|");
          return { setCode, collectorNumber };
        });
        const res = await fetch("/api/portfolio/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        });
        if (!res.ok) {
          setMsg("Couldn't reach the matcher — try again in a moment.");
          return;
        }
        const { matched } = (await res.json()) as { matched: Record<string, string> };
        for (const [k, p] of bySetNum) {
          const id = matched[k];
          if (id) {
            const cur = byId.get(id) ?? { qty: 0, unitCents: null, currency: p.currency };
            cur.qty += p.qty;
            if (p.unitCents != null) cur.unitCents = p.unitCents;
            byId.set(id, cur);
          } else {
            unmatched++;
          }
        }
      }

      if (!byId.size) {
        setMsg("No rows matched any cards in our database.");
        return;
      }

      // Apply: add the imported quantities on top of what's already owned, and set
      // the cost basis when a paid price was provided.
      let applied = 0;
      for (const [id, p] of byId) {
        setQty(id, getQty(id) + p.qty);
        if (p.unitCents != null && p.unitCents > 0) setCostBasis(id, p.unitCents, p.currency);
        applied++;
      }
      setMsg(
        `Imported ${applied} card${applied === 1 ? "" : "s"}` +
          (unmatched ? ` · ${unmatched} couldn't be matched and were skipped.` : ".")
      );
    } catch {
      setMsg("Couldn't read that file — make sure it's a CSV.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={doExport}
        disabled={exportRows.length === 0}
        className="rounded-lg bg-ink-800 px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-ink-700 hover:bg-ink-700 disabled:opacity-40"
      >
        ⬇ Export CSV
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="rounded-lg bg-ink-800 px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-ink-700 hover:bg-ink-700 disabled:opacity-40"
      >
        ⬆ Import CSV
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void doImport(f);
        }}
      />
      {msg && <span className="text-xs text-slate-400">{msg}</span>}
    </div>
  );
}
