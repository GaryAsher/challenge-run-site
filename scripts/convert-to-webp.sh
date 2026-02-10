#!/bin/bash
# convert-to-webp.sh
#
# Converts JPG/PNG images in assets/img/ to WebP format
# and updates all references across the codebase.
#
# Prerequisites:
#   brew install webp    (macOS)
#   apt install webp     (Linux)
#
# Usage:
#   bash scripts/convert-to-webp.sh           # Dry run (preview changes)
#   bash scripts/convert-to-webp.sh --apply   # Convert and update references

set -euo pipefail

DRY_RUN=true
if [ "${1:-}" = "--apply" ]; then
  DRY_RUN=false
fi

if ! command -v cwebp &>/dev/null; then
  echo "Error: cwebp not found."
  echo "  macOS: brew install webp"
  echo "  Linux: apt install webp"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMG_DIR="$REPO_ROOT/assets/img"

echo "=== WebP Conversion ==="
echo "Image directory: $IMG_DIR"
echo "Mode: $([ "$DRY_RUN" = true ] && echo 'DRY RUN (use --apply to convert)' || echo 'APPLYING')"
echo ""

# Cross-platform file size
filesize() {
  if stat -f%z "$1" &>/dev/null; then
    stat -f%z "$1"  # macOS
  else
    stat -c%s "$1"  # Linux
  fi
}

converted=0
skipped=0
total_saved=0

# Build file list
mapfile -t files < <(find "$IMG_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) | sort)

for src in "${files[@]}"; do
  size=$(filesize "$src")
  rel_src="${src#$REPO_ROOT/}"

  # Skip tiny placeholder files (< 100 bytes)
  if [ "$size" -lt 100 ]; then
    echo "  SKIP (placeholder): $rel_src ($size bytes)"
    skipped=$((skipped + 1))
    continue
  fi

  webp_path="${src%.*}.webp"
  rel_webp="${webp_path#$REPO_ROOT/}"

  if [ "$DRY_RUN" = true ]; then
    echo "  WOULD convert: $rel_src → $rel_webp"
    converted=$((converted + 1))
  else
    # Convert (quality 80 = good balance of size/quality)
    cwebp -q 80 "$src" -o "$webp_path" 2>/dev/null

    new_size=$(filesize "$webp_path")
    saved=$((size - new_size))

    echo "  CONVERTED: $rel_src → $rel_webp  (${size}B → ${new_size}B, saved ${saved}B)"

    # Update all references in source files
    grep -rl "$rel_src" "$REPO_ROOT" \
      --include="*.html" --include="*.md" --include="*.yml" --include="*.yaml" \
      --include="*.scss" --include="*.css" --include="*.js" \
      2>/dev/null | while read -r file; do
      sed -i.bak "s|$rel_src|$rel_webp|g" "$file" && rm -f "$file.bak"
      echo "    ↳ Updated: ${file#$REPO_ROOT/}"
    done

    rm "$src"

    converted=$((converted + 1))
    total_saved=$((total_saved + saved))
  fi
done

echo ""
echo "=== Summary ==="
echo "Files to convert: $converted"
echo "Skipped (placeholders): $skipped"
if [ "$DRY_RUN" = false ]; then
  echo "Total bytes saved: $total_saved"
fi
