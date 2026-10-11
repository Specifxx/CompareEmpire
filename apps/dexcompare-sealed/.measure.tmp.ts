import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { refusedForType, refusedListing } from "./src/lib/ebay-rules";
import { identify, isIdentity, TYPE_BY_LABEL, type TypeKey } from "./src/lib/sealed-title";
const S = process.argv[2];
const prisma = new PrismaClient();
(async () => {
  const rows: { page: string; slug: string; title: string }[] = [];
  for (let i = 0; i < 4; i++) for (const p of JSON.parse(readFileSync(`${S}/audit/chunk${i}.json`, "utf8"))) for (const r of p.rows) rows.push({ page: p.page, slug: p.product_slug, title: r.title });
  const audit = JSON.parse(readFileSync(`${S}/audit/result.json`, "utf8"));
  const wrongKey = new Set(audit.wrong.map((w: { page: string; title: string }) => `${w.page}|${w.title}`));
  const prods = await prisma.product.findMany({ where: { slug: { in: [...new Set(rows.map((r) => r.slug))] } }, select: { slug: true, productType: true } });
  const typeOf = new Map(prods.map((p) => [p.slug, TYPE_BY_LABEL.get(p.productType)?.key]));
  const guess = (slug: string): TypeKey | undefined => { const id = identify(slug.replace(/-/g, " "), {}); return isIdentity(id) ? id.type : undefined; };
  let tp = 0, fn = 0, fp = 0, tn = 0;
  const fps: string[] = [], fns: string[] = [];
  for (const r of rows) {
    const type = typeOf.get(r.slug) ?? guess(r.slug);
    const refused = refusedListing(r.title) || (type ? refusedForType(r.title, type) : false);
    const wrong = wrongKey.has(`${r.page}|${r.title}`);
    if (wrong && refused) tp++; else if (wrong) { fn++; fns.push(`${type} ${r.page.split("/")[0]} | ${r.title}`); } else if (refused) { fp++; fps.push(`${type ?? "?"} ${r.page.split("/")[0]} | ${r.title}`); } else tn++;
  }
  console.log(`wrong caught ${tp}/${tp + fn} (${Math.round((tp / (tp + fn)) * 100)}%); correct refused ${fp}/${fp + tn} (${((fp / (fp + tn)) * 100).toFixed(1)}%)`);
  console.log("\nCORRECT BUT REFUSED:"); for (const x of fps) console.log("  " + x.slice(0, 140));
  console.log("\nWRONG BUT KEPT:"); for (const x of fns) console.log("  " + x.slice(0, 140));
  await prisma.$disconnect();
})();
