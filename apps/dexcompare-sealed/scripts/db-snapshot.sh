#!/usr/bin/env bash
# DexCompare's working database, kept on GitHub instead of Neon (owner, 2026-11-23: "Dc2 is at limit, migrate to another
# database"; DECISIONS.md 2026-11-23). Every data job (dexcompare-sealed-import.yml, dexcompare-ebay-import.yml) runs on a
# throwaway Postgres inside the runner (a service container on localhost:5432):
#
#   db-snapshot.sh restore   fills it from the newest snapshot (the branch $BRANCH: dex.dump + counts.txt) and checks every
#                            table's row count against the one the snapshot recorded. With no snapshot yet (the first run),
#                            it copies the six tables from Neon (SEED_URL, DC2's direct host) instead and checks the counts
#                            against Neon's: that run IS the migration.
#   db-snapshot.sh save      dumps the job's database after the import and force-pushes it as the new snapshot (the previous
#                            one goes to $BRANCH-prev first, so one bad run can always be undone).
#
# Unlike data/public/ (what the site reads, culled by lib/focus.ts) the snapshot holds EVERY row of every table, culled
# products and the eBay call counter (EbayCallDay) included, exactly as Neon did. Nothing in it is private: the six tables
# are public product, offer, stat and eBay listing rows. The schema comes from prisma/schema.prisma (db push), the rows
# from the dump (data only, every COPY names its columns), so a column added later restores cleanly.
#
# Needs: docker (the runner has it), the repository checked out with its push credentials, LOCAL_URL (the service).
set -euo pipefail

MODE="${1:-}"
BRANCH="${DEX_DB_BRANCH:-dexcompare-db}"
PG_IMAGE="${PG_IMAGE:-postgres:18}"
LOCAL_URL="${LOCAL_URL:?LOCAL_URL, the job Postgres, is not set}"
# EbayEmptyFeed (2026-11-26): the eBay import's empty-search cache. A snapshot saved before it existed has no rows or count
# for it: restore checks only the tables the snapshot recorded, so the first run after the change loads cleanly with it empty.
TABLES=(Product Offer ProductStat StoreStat EbayListing EbayCallDay EbayEmptyFeed)
WORK="$(mktemp -d)"
REPO="$(git rev-parse --show-toplevel)"

case "$LOCAL_URL" in
  *@localhost:*|*@127.0.0.1:*|*@postgres:*) ;;
  *) echo "::error::LOCAL_URL is not the job's own Postgres: refusing."; exit 1 ;;
esac

pg() { docker run --rm --network host -v "$WORK:/w" -w /w "$PG_IMAGE" "$@"; }
table_args() { for t in "${TABLES[@]}"; do printf -- '-t\n"public"."%s"\n' "$t"; done; }
counts() {
  for t in "${TABLES[@]}"; do
    printf '%s %s\n' "$t" "$(pg psql "$1" -Atc "select count(*) from \"$t\"")"
  done
}
summary() { echo "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; echo "$*"; }

restore() {
  local source
  if git -C "$REPO" ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
    git -C "$REPO" fetch -q --depth 1 origin "$BRANCH"
    git -C "$REPO" show FETCH_HEAD:dex.dump > "$WORK/dex.dump"
    git -C "$REPO" show FETCH_HEAD:counts.txt > "$WORK/expected.txt"
    source="the snapshot (branch $BRANCH, $(git -C "$REPO" log -1 --format=%cI FETCH_HEAD))"
  else
    local seed="${SEED_URL:-}"
    if [ -z "$seed" ]; then echo "::error::No snapshot on $BRANCH and no SEED_URL (DC2) to copy from: refusing to start from an empty database."; exit 1; fi
    seed="$(printf '%s' "$seed" | sed -E 's/-pooler\././')"
    echo "::add-mask::$seed"
    mapfile -t targs < <(table_args)
    pg pg_dump --data-only --no-owner --no-privileges -Fc "${targs[@]}" -f /w/dex.dump "$seed"
    counts "$seed" > "$WORK/expected.txt"
    source="Neon (DC2), the one-time copy"
  fi
  # The tables are already there (prisma db push, the step before); the rows go in as one transaction.
  pg pg_restore --data-only --no-owner --no-privileges --single-transaction --exit-on-error --disable-triggers -d "$LOCAL_URL" /w/dex.dump
  # Only the tables the snapshot recorded (a table added since starts empty and has no expected count).
  counts "$LOCAL_URL" | awk 'NR==FNR{want[$1];next} ($1 in want)' "$WORK/expected.txt" - > "$WORK/got.txt"
  summary "Database loaded from $source ($(du -h "$WORK/dex.dump" | cut -f1) dump)."
  summary ""; summary "| Table | Expected | Loaded |"; summary "|---|---|---|"
  join <(sort "$WORK/expected.txt") <(sort "$WORK/got.txt") | while read -r t a b; do summary "| $t | $a | $b |"; done
  if ! diff -q "$WORK/expected.txt" "$WORK/got.txt" >/dev/null; then
    echo "::error::Row counts differ after loading the database: $(paste -sd' ' "$WORK/expected.txt") vs $(paste -sd' ' "$WORK/got.txt")"
    exit 1
  fi
  if [ "$(awk '$1=="Product"{print $2}' "$WORK/got.txt")" -lt 1 ]; then echo "::error::The loaded database has no products."; exit 1; fi
}

save() {
  counts "$LOCAL_URL" > "$WORK/counts.txt"
  if [ "$(awk '$1=="Product"{print $2}' "$WORK/counts.txt")" -lt 1 ]; then echo "::error::The job's database has no products: not saving it over the snapshot."; exit 1; fi
  mapfile -t targs < <(table_args)
  pg pg_dump --data-only --no-owner --no-privileges -Fc -Z 9 "${targs[@]}" -f /w/dex.dump "$LOCAL_URL"
  local size; size="$(stat -c %s "$WORK/dex.dump")"
  if [ "$size" -gt 90000000 ]; then echo "::error::The snapshot is $size bytes, too close to GitHub's 100 MB file limit."; exit 1; fi
  [ "$size" -gt 45000000 ] && echo "::warning::The database snapshot is $((size / 1000000)) MB (GitHub refuses files over 100 MB)."
  cat > "$WORK/README.md" <<'MD'
DexCompare's working database (the tables of apps/dexcompare-sealed/prisma/schema.prisma), written by the data jobs after
every import (apps/dexcompare-sealed/scripts/db-snapshot.sh). Force-pushed, one commit; `dexcompare-db-prev` holds the one before.
Never edit by hand, never merge into main.
MD
  cd "$REPO"
  local tree commit
  tree="$(printf '100644 blob %s\tREADME.md\n100644 blob %s\tcounts.txt\n100644 blob %s\tdex.dump\n' \
    "$(git hash-object -w "$WORK/README.md")" "$(git hash-object -w "$WORK/counts.txt")" "$(git hash-object -w "$WORK/dex.dump")" | git mktree)"
  commit="$(git -c user.name="dexcompare-data[bot]" -c user.email="dexcompare-data@users.noreply.github.com" \
    commit-tree "$tree" -m "DexCompare database: $(date -u +%Y-%m-%dT%H:%MZ) (${WHY:-manual})" -m "$(paste -sd' ' "$WORK/counts.txt")")"
  if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
    git fetch -q --depth 1 origin "$BRANCH"
    git push -q -f origin "FETCH_HEAD:refs/heads/$BRANCH-prev" || echo "::warning::Could not keep the previous snapshot on $BRANCH-prev."
  fi
  local i
  for i in 1 2 3 4; do
    if git push -q -f origin "$commit:refs/heads/$BRANCH"; then
      summary "Database saved to branch $BRANCH ($((size / 1000)) kB): $(paste -sd' ' "$WORK/counts.txt")."
      return 0
    fi
    sleep $((i * 5))
  done
  echo "::error::Could not push the database snapshot."; exit 1
}

case "$MODE" in
  restore) restore ;;
  save) save ;;
  *) echo "usage: db-snapshot.sh restore|save"; exit 2 ;;
esac
