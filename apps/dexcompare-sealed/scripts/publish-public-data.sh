#!/usr/bin/env bash
# Commits apps/dexcompare-sealed/data/public/ (just written by scripts/export-public-data.ts) to main and pushes it. With the second
# argument "release", that commit is what puts the new prices live: its subject carries [deploy], so Vercel builds it
# (scripts/vercel-ignore-build.sh) and the build bundles the files the site reads. Without it (the eBay import) the commit rides the
# next release, which carries the newest snapshot anyway: production builds once per sealed import, twice a day, not once per
# workflow (DEPLOY.md, "Where the data lives"). Run from the repository root, in a checkout of main,
# after the export.
#
# Another workflow may have pushed meanwhile (the sealed and eBay imports both publish): on a rejected push the fresh files are set
# aside, main is fetched again, the files go back on top and the push is retried. A snapshot is a whole-database export, so the
# latest one simply wins.
set -euo pipefail
DIR="apps/dexcompare-sealed/data/public"
WHY="${1:-export}"
MARK=""
[ "${2:-}" = "release" ] && MARK=" [deploy]"
git config user.name "dexcompare-data[bot]"
git config user.email "dexcompare-data@users.noreply.github.com"
# data/sets/discovered.json (scripts/discover-sets.ts, run before the import) rides the same commit.
SETS_DIR="apps/dexcompare-sealed/data/sets"
# data/amazon/ (scripts/amazon-asins.ts: ASINs and the run's status, never prices) rides the same commit.
AMAZON_DIR="apps/dexcompare-sealed/data/amazon"
if git diff --quiet -- "$DIR" "$SETS_DIR" "$AMAZON_DIR" && [ -z "$(git ls-files --others --exclude-standard -- "$DIR" "$SETS_DIR" "$AMAZON_DIR")" ]; then
  echo "[publish] data/public and data/sets unchanged — nothing to commit."
  exit 0
fi
TMP="$(mktemp -d)"
cp -r "$DIR/." "$TMP/"
TMP_SETS="$(mktemp -d)"
[ -d "$SETS_DIR" ] && cp -r "$SETS_DIR/." "$TMP_SETS/"
for attempt in 1 2 3 4 5; do
  git fetch -q origin main
  git reset -q --hard origin/main
  mkdir -p "$DIR"
  rm -f "$DIR"/*.json
  cp -r "$TMP/." "$DIR/"
  # The feed's state (src/lib/feed.ts) belongs to the sealed import's feed step: any other publisher (the eBay import) keeps main's.
  if [ "${PUBLISH_FEED_STATE:-}" != "1" ]; then
    git checkout -q origin/main -- "$DIR/feed-state.json" 2>/dev/null || rm -f "$DIR/feed-state.json"
  fi
  if [ -n "$(ls -A "$TMP_SETS")" ]; then mkdir -p "$SETS_DIR"; cp -r "$TMP_SETS/." "$SETS_DIR/"; fi
  git add -A -- "$DIR" "$SETS_DIR" "$AMAZON_DIR"
  if git diff --cached --quiet; then
    echo "[publish] main already has this snapshot."
    exit 0
  fi
  git commit -q -m "DexCompare data: $(date -u +%Y-%m-%dT%H:%MZ) ($WHY)$MARK" -m "Public data export (apps/dexcompare-sealed/data/public/), the files the site reads instead of the database."
  if git push -q origin HEAD:main; then
    echo "[publish] pushed $(git rev-parse --short HEAD) on attempt $attempt."
    exit 0
  fi
  sleep $((attempt * 5))
done
echo "[publish] could not push after 5 attempts." >&2
exit 1
