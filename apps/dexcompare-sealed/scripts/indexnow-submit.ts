// Submit every URL in the live sitemap to IndexNow (Bing, Yandex, Seznam, Naver)
// so they recrawl now. Run daily by .github/workflows/indexnow-submit.yml (at
// the repository root) after the evening import, and by hand from Actions.
//
//   SITE_URL   where to read the sitemap (default https://dexcompare.app)
//
// The key is whatever the live /indexnow.txt serves (src/lib/indexnow.ts), so
// the job needs no secret and can never disagree with the site. The request
// names the host of the sitemap's own URLs. The run FAILS, with IndexNow's
// answer in the log, when a batch is refused, when the key file is not live or
// when the sitemap is empty: a "0 of N submitted" on a green run is invisible.
// A first submission for a host is often answered 403 SiteVerificationNotCompleted
// while the engine fetches the key file; the run waits and retries a few times.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { INDEXNOW_BATCH, isIndexNowKey, nextState, pickUrls, sitemapUrls, submissionPlan, type SentState } from "../src/lib/indexnow";

// Kept between runs by the workflow's Actions cache; a missing or unreadable file means "nothing sent yet".
const STATE_FILE = process.env.INDEXNOW_STATE || ".indexnow-state.json";

const UA = "DexCompare-indexnow (+https://dexcompare.app)";

async function get(url: string): Promise<string> {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.text();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const site = (process.env.SITE_URL || "https://dexcompare.app").replace(/\/+$/, "");
  const plan = submissionPlan(await sitemapUrls(`${site}/sitemap.xml`, get));
  if (!plan || !plan.urls.length) {
    console.error(`IndexNow: ${site}/sitemap.xml listed no page URLs — nothing submitted.`);
    process.exitCode = 1;
    return;
  }
  if (plan.dropped) console.warn(`IndexNow: ${plan.dropped} URL(s) not on ${plan.host} left out.`);

  let key = "";
  for (let i = 0; i < 20 && !isIndexNowKey(key); i++) {
    try {
      key = (await get(plan.keyLocation)).trim();
    } catch {
      /* not deployed yet */
    }
    if (!isIndexNowKey(key)) await sleep(10_000);
  }
  if (!isIndexNowKey(key)) {
    console.error(`IndexNow: ${plan.keyLocation} does not serve a key (deploy src/app/indexnow.txt). Nothing submitted.`);
    process.exitCode = 1;
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  let state: SentState = {};
  try {
    if (existsSync(STATE_FILE)) state = JSON.parse(readFileSync(STATE_FILE, "utf8")) as SentState;
  } catch {
    state = {};
  }
  const pick = pickUrls(plan.urls, state, today);
  console.log(`IndexNow: ${plan.urls.length} sitemap URLs for ${plan.host}; sending ${pick.length} (new, then unsent for a week), ${INDEXNOW_BATCH} a request.`);
  const done: string[] = [];
  let sent = 0;
  for (let i = 0; i < pick.length; i += INDEXNOW_BATCH) {
    const batch = pick.slice(i, i + INDEXNOW_BATCH);
    const n = i / INDEXNOW_BATCH + 1;
    for (let attempt = 1; ; attempt++) {
      const r = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8", "User-Agent": UA },
        body: JSON.stringify({ host: plan.host, key, keyLocation: plan.keyLocation, urlList: batch }),
      });
      const body = r.ok ? "" : (await r.text().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 500);
      console.log(`batch ${n}: ${batch.length} URLs → HTTP ${r.status}${body ? ` — ${body}` : ""}`);
      if (r.ok) {
        sent += batch.length;
        done.push(...batch);
        break;
      }
      // The engine is still fetching the key file for a new host: wait and retry, a few times.
      if (r.status === 403 && /SiteVerificationNotCompleted/i.test(body) && attempt < 4) {
        await sleep(60_000);
        continue;
      }
      break;
    }
    if (i + INDEXNOW_BATCH < pick.length) await sleep(2_000);
  }
  writeFileSync(STATE_FILE, JSON.stringify(nextState(plan.urls, state, done, today)));
  console.log(`IndexNow: ${sent} of ${pick.length} URLs submitted for ${plan.host}.`);
  if (sent < pick.length) {
    console.error("IndexNow refused part of the submission (above): failing the run.");
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("indexnow-submit.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
