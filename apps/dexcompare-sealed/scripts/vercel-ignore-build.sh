#!/usr/bin/env bash
# Vercel "Ignored Build Step" for DexCompare, wired from vercel.json's `ignoreCommand`. Vercel runs it
# in the project's Root Directory (apps/dexcompare-sealed) before each deployment. Vercel's contract:
#
#   exit 0  → skip: no deployment is built for this push
#   exit 1  → build as normal
#
# PRODUCTION (VERCEL_ENV=production) is unchanged from the one-line command this replaces,
# `git diff --quiet HEAD^ HEAD -- .`: build when the pushed commit changed something under
# apps/dexcompare-sealed, skip it otherwise (every production build empties the ISR page cache, so a
# push to another app of the monorepo must not cost one). If git cannot compare the two commits, build:
# "never deploys" is worse than "deploys once too often". An UNKNOWN environment (VERCEL_ENV unset:
# the project's "Automatically expose System Environment Variables" is off) is treated as production,
# so production can never be skipped by this file's preview rule.
#
# PREVIEW AND DEVELOPMENT BUILDS ARE OFF (owner, 2026-10-14). The project's environment variables are
# scoped Production AND Preview (DEPLOY.md, step 4), so a preview build reads the PRODUCTION database:
# every push to any branch that touched the app built a preview that prerendered the eight sitemap
# files against it. A preview now builds only when the commit SUBJECT carries the literal marker
# [preview] (any case) and the app changed, and the marker goes in only when the owner asks for a
# preview of that commit. The SUBJECT only, as on the sister sites: a body that mentions the marker in
# prose does not build. An unreadable commit message never builds a preview. Even then the build reads
# no database (src/lib/build-env.ts).
#
# VERCEL_ENV and VERCEL_GIT_COMMIT_MESSAGE are Vercel system environment variables, available to this
# step; without the message, `git log -1` reads it (Vercel clones with a history depth of 10).
# Pattern: RiftCompare's and MTG Compare's scripts/vercel-ignore-build.sh.
# Pinned by tests/vercel-ignore-build.test.ts.
set -u

PREVIEW_MARKER='[preview]'

git diff --quiet HEAD^ HEAD -- . 2>/dev/null
diff=$? # 0: nothing under this app changed; 1: it changed; anything else: git could not tell

env="${VERCEL_ENV:-}"
if [ "$env" = "preview" ] || [ "$env" = "development" ]; then
  msg="${VERCEL_GIT_COMMIT_MESSAGE:-}"
  if [ -z "$msg" ]; then
    msg="$(git log -1 --format=%B 2>/dev/null || true)"
  fi
  subject="$(printf '%s\n' "$msg" | head -n 1)"
  if [ -z "$subject" ] || ! printf '%s' "$subject" | grep -qiF -- "$PREVIEW_MARKER"; then
    echo "[vercel-ignore-build] VERCEL_ENV=$env: previews are off (owner, 2026-10-14) — skipping. Put '$PREVIEW_MARKER' in the commit SUBJECT only when the owner asks for a preview."
    exit 0
  fi
  if [ "$diff" -eq 0 ]; then
    echo "[vercel-ignore-build] VERCEL_ENV=$env: '$PREVIEW_MARKER' in the subject, but nothing under apps/dexcompare-sealed changed — skipping."
    exit 0
  fi
  echo "[vercel-ignore-build] VERCEL_ENV=$env: '$PREVIEW_MARKER' in the commit subject — building the preview that was asked for."
  exit 1
fi

case "$diff" in
  0)
    echo "[vercel-ignore-build] VERCEL_ENV=${env:-unset (treated as production)}: nothing under apps/dexcompare-sealed changed — skipping."
    exit 0
    ;;
  1)
    echo "[vercel-ignore-build] VERCEL_ENV=${env:-unset (treated as production)}: apps/dexcompare-sealed changed — building."
    exit 1
    ;;
  *)
    echo "[vercel-ignore-build] VERCEL_ENV=${env:-unset (treated as production)}: git could not compare HEAD^ with HEAD (status $diff) — building, to fail open."
    exit 1
    ;;
esac
