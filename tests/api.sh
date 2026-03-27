#!/usr/bin/env bash
# tests/api.sh — smoke tests for /api/capabilities and /api/process
# Usage: ./tests/api.sh [base_url] [image_file]
#   base_url   default: http://localhost:3000
#   image_file default: tests/fixtures/test.png

BASE="${1:-http://localhost:3000}"
IMAGE="${2:-$(dirname "$0")/fixtures/test.png}"
PASS=0
FAIL=0

# ── helpers ──────────────────────────────────────────────────────────────────

green() { printf '\033[32m✓ %s\033[0m\n' "$*"; }
red()   { printf '\033[31m✗ %s\033[0m\n' "$*"; }

check() {
  local label="$1" expected_code="$2" out_file="$3"
  local actual_code actual_type
  actual_code=$(cat "${out_file}.code" 2>/dev/null)
  actual_type=$(file -b "$out_file" 2>/dev/null)

  if [[ "$actual_code" != "$expected_code" ]]; then
    red "$label — expected HTTP $expected_code, got $actual_code"
    [[ -f "$out_file" ]] && cat "$out_file"
    FAIL=$((FAIL+1))
    return 1
  fi

  # If a 4th arg is given, assert it appears in file type output
  if [[ -n "$4" ]] && ! echo "$actual_type" | grep -qi "$4"; then
    red "$label — expected file type '$4', got: $actual_type"
    FAIL=$((FAIL+1))
    return 1
  fi

  green "$label"
  PASS=$((PASS+1))
}

post() {
  local out="/tmp/test_api_$RANDOM"
  local code
  code=$(curl -s -X POST "$BASE/api/process" "$@" -o "$out" -w '%{http_code}')
  echo "$code" > "${out}.code"
  echo "$out"
}

get() {
  local out="/tmp/test_api_$RANDOM"
  local code
  code=$(curl -s -X GET "$BASE$1" -o "$out" -w '%{http_code}')
  echo "$code" > "${out}.code"
  echo "$out"
}

# ── 1. Capabilities ───────────────────────────────────────────────────────────
echo ""
echo "── Capabilities ────────────────────────────────────────────────────────"

out=$(get /api/capabilities)
check "GET /api/capabilities returns 200" "200" "$out"
if grep -q '"inputFormats"' "$out" && grep -q '"outputFormats"' "$out"; then
  green "  capabilities body has inputFormats + outputFormats"
  PASS=$((PASS+1))
else
  red "  capabilities body missing inputFormats or outputFormats"
  FAIL=$((FAIL+1))
fi

# ── 2. Basic conversion ───────────────────────────────────────────────────────
echo ""
echo "── Basic conversion ────────────────────────────────────────────────────"

out=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=jpeg')
check "PNG→JPEG (no ops)" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=png')
check "PNG→PNG passthrough" "200" "$out" "PNG"

out=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=webp')
check "PNG→WebP" "200" "$out" "Web/P"

out=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=avif')
check "PNG→AVIF" "200" "$out" "AVIF"

out=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=tiff')
check "PNG→TIFF" "200" "$out" "TIFF"

out=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=gif')
check "PNG→GIF" "200" "$out" "GIF"

# ── 3. Transform ops ─────────────────────────────────────────────────────────
echo ""
echo "── Transform ops ───────────────────────────────────────────────────────"

out=$(post -F "file=@$IMAGE" -F 'ops={"resizeWidth":200,"resizeHeight":200,"resizeMode":"fit"}' -F 'outputFormat=jpeg')
check "Resize fit 200×200" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"rotate":90}' -F 'outputFormat=jpeg')
check "Rotate 90°" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"flip":true}' -F 'outputFormat=jpeg')
check "Flip" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"flop":true}' -F 'outputFormat=jpeg')
check "Flop" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"autoOrient":true}' -F 'outputFormat=jpeg')
check "Auto-orient" "200" "$out" "JPEG"

# ── 4. Color ops ─────────────────────────────────────────────────────────────
echo ""
echo "── Color ops ───────────────────────────────────────────────────────────"

out=$(post -F "file=@$IMAGE" -F 'ops={"brightnessContrastB":20,"brightnessContrastC":30}' -F 'outputFormat=jpeg')
check "Brightness/contrast" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"gamma":1.5}' -F 'outputFormat=jpeg')
check "Gamma" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"grayscale":true}' -F 'outputFormat=png')
check "Grayscale" "200" "$out" "PNG"

out=$(post -F "file=@$IMAGE" -F 'ops={"sepia":true,"sepiaTone":75}' -F 'outputFormat=jpeg')
check "Sepia tone" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"modulateBrightness":120,"modulateSaturation":80}' -F 'outputFormat=jpeg')
check "Modulate brightness/saturation" "200" "$out" "JPEG"

# ── 5. Blur/Sharpen ops ───────────────────────────────────────────────────────
echo ""
echo "── Blur/Sharpen ops ────────────────────────────────────────────────────"

out=$(post -F "file=@$IMAGE" -F 'ops={"gaussianBlurSigma":3}' -F 'outputFormat=jpeg')
check "Gaussian blur" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"sharpenSigma":2}' -F 'outputFormat=jpeg')
check "Sharpen" "200" "$out" "JPEG"

# ── 6. Effects ────────────────────────────────────────────────────────────────
echo ""
echo "── Effects ─────────────────────────────────────────────────────────────"

out=$(post -F "file=@$IMAGE" -F 'ops={"charcoalRadius":2}' -F 'outputFormat=jpeg')
check "Charcoal" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"swirlAngle":90}' -F 'outputFormat=jpeg')
check "Swirl" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"implodeFactor":0.5}' -F 'outputFormat=jpeg')
check "Implode" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"posterizeLevels":4}' -F 'outputFormat=png')
check "Posterize" "200" "$out" "PNG"

# ── 7. Border & Annotate ──────────────────────────────────────────────────────
echo ""
echo "── Border & Annotate ───────────────────────────────────────────────────"

out=$(post -F "file=@$IMAGE" -F 'ops={"border":true,"borderWidth":20,"borderColor":"#FF0000"}' -F 'outputFormat=png')
check "Border 20px red" "200" "$out" "PNG"
# verify dimensions grew
actual_type=$(file -b "$out" 2>/dev/null)
if echo "$actual_type" | grep -q "552 x 552\|552x552"; then
  green "  border dimensions correct (552×552)"
  PASS=$((PASS+1))
else
  red "  border dimensions unexpected: $actual_type"
  FAIL=$((FAIL+1))
fi

out=$(post -F "file=@$IMAGE" \
  -F 'ops={"annotate":true,"annotateText":"Hello World","annotateSize":48,"annotateColor":"#FFFFFF","annotateX":20,"annotateY":60}' \
  -F 'outputFormat=jpeg')
check "Annotate text" "200" "$out" "JPEG"

# ── 8. Output options ─────────────────────────────────────────────────────────
echo ""
echo "── Output options ──────────────────────────────────────────────────────"

out=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=jpeg' -F 'strip=true' -F 'interlace=true')
check "JPEG strip + interlace" "200" "$out" "progressive"

out=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=webp' -F 'losslessWebp=true')
check "Lossless WebP" "200" "$out" "Web/P"

# ── 9. Validation errors ──────────────────────────────────────────────────────
echo ""
echo "── Validation errors ───────────────────────────────────────────────────"

out=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=exe')
check "Bad outputFormat → 400" "400" "$out"

out=$(post -F "file=@$IMAGE" -F 'ops=[1,2,3]' -F 'outputFormat=jpeg')
check "ops is array → 400" "400" "$out"

out=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=jpeg' -F 'quality=999')
check "quality out of range → 400" "400" "$out"

out=$(post -F 'ops={}' -F 'outputFormat=jpeg')
check "No file → 400" "400" "$out"

fake="/tmp/test_api_notanimage_$$.txt"
echo "not an image" > "$fake"
out=$(post -F "file=@$fake" -F 'ops={}' -F 'outputFormat=jpeg')
code=$(cat "${out}.code" 2>/dev/null)
if [[ "$code" == "400" || "$code" == "415" ]]; then
  check "Non-image file → 400/415" "$code" "$out"
else
  red "Non-image file — expected HTTP 400 or 415, got $code"
  FAIL=$((FAIL+1))
fi
rm -f "$fake"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "════════════════════════════════════════════════════════"
echo ""
[[ $FAIL -eq 0 ]]
