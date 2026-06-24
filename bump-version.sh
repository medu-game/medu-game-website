#!/usr/bin/env bash
# Bump the ?v=N cache-buster on every CSS/JS reference across all HTML files.
# Run this after editing anything in assets/ (CSS or JS) so browsers re-fetch
# instead of serving a stale cached copy.
#
#   ./bump-version.sh        # auto: current highest version + 1
#   ./bump-version.sh 12     # set an explicit version
#
# Keeps every <link>/<script> ?v= in sync across index.html and modules/*.html.
set -euo pipefail
cd "$(dirname "$0")"

shopt -s nullglob
files=(src/index.html src/modules/*.html)
if [ ${#files[@]} -eq 0 ]; then
  echo "No HTML files found." >&2
  exit 1
fi

current=$(grep -ohE '\?v=[0-9]+' "${files[@]}" | grep -oE '[0-9]+' | sort -n | tail -1)
current=${current:-0}
next=${1:-$((current + 1))}

if ! [[ "$next" =~ ^[0-9]+$ ]]; then
  echo "Version must be a number, got: $next" >&2
  exit 1
fi

for f in "${files[@]}"; do
  sed -i '' -E "s/\?v=[0-9]+/?v=${next}/g" "$f"   # BSD/macOS sed
done

echo "Cache-buster: v${current} → v${next}  (${#files[@]} files updated)"
