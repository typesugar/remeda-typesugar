#!/usr/bin/env bash
# Regenerate vendor/typesugar/*.tgz from a typesugar checkout.
#
#   vendor/typesugar/pack.sh /path/to/typesugar
#
# Checks out nothing itself: pass a clean checkout (or worktree) at the commit
# you want. Builds the packages the case study needs, packs them with
# `pnpm pack` (which rewrites workspace:* to real versions, as `npm publish`
# would), records the commit in vendor/typesugar/COMMIT, and points
# case-study/package.json at the new tarballs. Then run
# `npm install --prefix case-study`.
set -euo pipefail

TS_REPO="${1:?usage: pack.sh /path/to/typesugar}"
OUT="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$OUT/../.." && pwd)"

# typesugar, unplugin-typesugar and @typesugar/fusion, plus their workspace
# dependencies.
PACKAGES=(
  typesugar core macros transformer lsp-common transformer-core reflect derive
  typeclass unplugin-typesugar type-system std fp contracts fusion
)

cd "$TS_REPO"
if [ -n "$(git status --porcelain)" ]; then
  echo "error: $TS_REPO has uncommitted changes; pack from a clean commit" >&2
  exit 1
fi
COMMIT="$(git rev-parse HEAD)"

pnpm install --frozen-lockfile
filters=()
for p in "${PACKAGES[@]}"; do filters+=(--filter "./packages/$p..."); done
# Two builds at a time by default: one transformer dts build peaks around
# 1.8 GB RSS.
pnpm -r --workspace-concurrency="${PACK_CONCURRENCY:-2}" "${filters[@]}" build

# Tarball names carry the commit (typesugar-core-0.1.1-<sha>.tgz), so a repack
# is a new file name and the lockfile's integrity check can't keep old bytes.
SHORT="${COMMIT:0:8}"
rm -f "$OUT"/*.tgz
for p in "${PACKAGES[@]}"; do
  tgz="$(cd "packages/$p" && pnpm pack --pack-destination "$OUT" | tail -1)"
  mv "$tgz" "${tgz%.tgz}-$SHORT.tgz"
done

{
  echo "commit: $COMMIT"
  echo "branch: $(git rev-parse --abbrev-ref HEAD)"
  echo "remote: $(git remote get-url origin | sed -E 's#^git@[^:]+:#https://github.com/#; s#://[^/@]+@#://#; s#\.git$##')"
  echo "packed: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "node:   $(node --version)"
  echo "files:"
  (cd "$OUT" && shasum -a 256 *.tgz | sed 's/^/  /')
} > "$OUT/COMMIT"

# Point the case-study package's dependencies and overrides at the new names.
sed -E -i.bak "s#(vendor/typesugar/[a-z-]+-[0-9]+\.[0-9]+\.[0-9]+[^-/\"]*)(-[0-9a-f]{8})?\.tgz#\1-$SHORT.tgz#g" \
  "$ROOT/case-study/package.json"
rm -f "$ROOT/case-study/package.json.bak"

echo "packed ${#PACKAGES[@]} packages from $COMMIT into $OUT"
echo "now run: npm install --prefix case-study"
