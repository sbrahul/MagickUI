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

# check_dims <label> <out_file> <expected_WxH substring>
check_dims() {
  local label="$1" out_file="$2" expected="$3"
  local actual_type
  actual_type=$(file -b "$out_file" 2>/dev/null)
  if echo "$actual_type" | grep -q "$expected"; then
    green "  $label dimensions correct ($expected)"
    PASS=$((PASS+1))
  else
    red "  $label — expected dimensions '$expected', got: $actual_type"
    FAIL=$((FAIL+1))
  fi
}

post() {
  local out="/tmp/test_api_$RANDOM$RANDOM"
  local code
  code=$(curl -s -X POST "$BASE/api/process" "$@" -o "$out" -w '%{http_code}')
  echo "$code" > "${out}.code"
  echo "$out"
}

get() {
  local out="/tmp/test_api_$RANDOM$RANDOM"
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
check_dims "Resize fit (512 input → max 200)" "$out" "200 x 200\|200x200"

out=$(post -F "file=@$IMAGE" -F 'ops={"resizeWidth":300,"resizeHeight":150,"resizeMode":"exact"}' -F 'outputFormat=jpeg')
check "Resize exact 300×150" "200" "$out" "JPEG"
check_dims "Resize exact" "$out" "300 x 150\|300x150"

out=$(post -F "file=@$IMAGE" -F 'ops={"resizeWidth":300,"resizeHeight":150,"resizeMode":"fill","gravity":"Center"}' -F 'outputFormat=jpeg')
check "Resize fill 300×150" "200" "$out" "JPEG"
check_dims "Resize fill" "$out" "300 x 150\|300x150"

out=$(post -F "file=@$IMAGE" -F 'ops={"resizeWidth":50,"resizeMode":"percent"}' -F 'outputFormat=jpeg')
check "Resize percent 50%" "200" "$out" "JPEG"
check_dims "Resize percent (512 × 50% = 256)" "$out" "256 x 256\|256x256"

out=$(post -F "file=@$IMAGE" -F 'ops={"rotate":90}' -F 'outputFormat=jpeg')
check "Rotate 90°" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"rotate":45,"rotateBg":"#FF0000"}' -F 'outputFormat=png')
check "Rotate 45° with red background" "200" "$out" "PNG"

out=$(post -F "file=@$IMAGE" -F 'ops={"flip":true}' -F 'outputFormat=jpeg')
check "Flip" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"flop":true}' -F 'outputFormat=jpeg')
check "Flop" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"autoOrient":true}' -F 'outputFormat=jpeg')
check "Auto-orient" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"trim":true}' -F 'outputFormat=png')
check "Trim borders" "200" "$out" "PNG"

# Crop: centre 50%×50% (x=0.25,y=0.25,w=0.5,h=0.5 → 256×256 of 512×512)
out=$(post -F "file=@$IMAGE" -F 'ops={"crop":{"x":0.25,"y":0.25,"width":0.5,"height":0.5}}' -F 'outputFormat=png')
check "Crop 50%×50% region" "200" "$out" "PNG"
check_dims "Crop output size (256×256)" "$out" "256 x 256\|256x256"

# ── 4. Color ops ─────────────────────────────────────────────────────────────
echo ""
echo "── Color ops ───────────────────────────────────────────────────────────"

out=$(post -F "file=@$IMAGE" -F 'ops={"brightnessContrast":true,"brightnessContrastB":20,"brightnessContrastC":30}' -F 'outputFormat=jpeg')
check "Brightness/contrast" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"gamma":1.5}' -F 'outputFormat=jpeg')
check "Gamma" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"grayscale":true}' -F 'outputFormat=png')
check "Grayscale" "200" "$out" "PNG"

out=$(post -F "file=@$IMAGE" -F 'ops={"sepiaTone":true,"sepiaTone":75}' -F 'outputFormat=jpeg')
check "Sepia tone" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"modulate":true,"modulateBrightness":120,"modulateSaturation":80,"modulateHue":100}' -F 'outputFormat=jpeg')
check "Modulate brightness/saturation/hue" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"negate":true}' -F 'outputFormat=jpeg')
check "Negate (invert)" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"normalize":true}' -F 'outputFormat=jpeg')
check "Normalize" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"equalize":true}' -F 'outputFormat=jpeg')
check "Equalize" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"whiteBalance":true}' -F 'outputFormat=jpeg')
check "White balance" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"levelBlack":5,"levelWhite":95,"levelGamma":1.2}' -F 'outputFormat=jpeg')
check "Levels (black/white/gamma)" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"colorspace":"Gray"}' -F 'outputFormat=jpeg')
check "Colorspace: Gray" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"colorspace":"sRGB"}' -F 'outputFormat=jpeg')
check "Colorspace: sRGB" "200" "$out" "JPEG"

# ── 5. Blur/Sharpen ops ───────────────────────────────────────────────────────
echo ""
echo "── Blur / Sharpen ops ──────────────────────────────────────────────────"

out=$(post -F "file=@$IMAGE" -F 'ops={"gaussianBlur":true,"gaussianBlurSigma":3}' -F 'outputFormat=jpeg')
check "Gaussian blur" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"sharpen":true,"sharpenSigma":2}' -F 'outputFormat=jpeg')
check "Sharpen" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" \
  -F 'ops={"unsharp":true,"unsharpRadius":0,"unsharpSigma":1,"unsharpAmount":1,"unsharpThreshold":0.05}' \
  -F 'outputFormat=jpeg')
check "Unsharp mask" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"median":true,"medianRadius":3}' -F 'outputFormat=jpeg')
check "Median filter" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"despeckle":true}' -F 'outputFormat=jpeg')
check "Despeckle" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"waveletDenoise":5}' -F 'outputFormat=jpeg')
check "Wavelet denoise" "200" "$out" "JPEG"

# ── 6. Effects ────────────────────────────────────────────────────────────────
echo ""
echo "── Effects ─────────────────────────────────────────────────────────────"

out=$(post -F "file=@$IMAGE" -F 'ops={"charcoal":true,"charcoalRadius":2}' -F 'outputFormat=jpeg')
check "Charcoal" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"emboss":true,"embossSigma":1}' -F 'outputFormat=jpeg')
check "Emboss" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"edge":true,"edgeRadius":1}' -F 'outputFormat=jpeg')
check "Edge detect" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"sketch":true,"sketchSigma":5,"sketchAngle":45}' -F 'outputFormat=jpeg')
check "Sketch" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"spread":true,"spreadRadius":5}' -F 'outputFormat=jpeg')
check "Spread" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"swirl":true,"swirlAngle":90}' -F 'outputFormat=jpeg')
check "Swirl" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"wave":true,"waveAmplitude":25,"waveWavelength":150}' -F 'outputFormat=jpeg')
check "Wave" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"implode":true,"implodeFactor":0.5}' -F 'outputFormat=jpeg')
check "Implode" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"implode":true,"implodeFactor":-0.5}' -F 'outputFormat=jpeg')
check "Explode (negative implode)" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"posterize":true,"posterizeLevels":4}' -F 'outputFormat=png')
check "Posterize" "200" "$out" "PNG"

out=$(post -F "file=@$IMAGE" -F 'ops={"solarize":true,"solarizeThreshold":50}' -F 'outputFormat=jpeg')
check "Solarize" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"paint":true,"paintRadius":3}' -F 'outputFormat=jpeg')
check "Oil paint" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" -F 'ops={"vignette":true,"vignetteSigma":10}' -F 'outputFormat=jpeg')
check "Vignette" "200" "$out" "JPEG"

# ── 7. Border & Annotate ──────────────────────────────────────────────────────
echo ""
echo "── Border & Annotate ───────────────────────────────────────────────────"

out=$(post -F "file=@$IMAGE" -F 'ops={"border":true,"borderWidth":20,"borderColor":"#FF0000"}' -F 'outputFormat=png')
check "Border 20px red" "200" "$out" "PNG"
check_dims "Border dimensions (512+40=552)" "$out" "552 x 552\|552x552"

out=$(post -F "file=@$IMAGE" \
  -F 'ops={"annotate":true,"annotateText":"Hello World","annotateSize":48,"annotateColor":"#FFFFFF","annotateX":20,"annotateY":60}' \
  -F 'outputFormat=jpeg')
check "Annotate text (default gravity)" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" \
  -F 'ops={"annotate":true,"annotateText":"WM","annotateSize":24,"annotateColor":"#000000","gravity":"SouthEast","annotateX":10,"annotateY":10}' \
  -F 'outputFormat=jpeg')
check "Annotate with SouthEast gravity" "200" "$out" "JPEG"

out=$(post -F "file=@$IMAGE" \
  -F 'ops={"annotate":true,"annotateText":"Rotated","annotateSize":36,"annotateColor":"#FFFFFF","annotateRotation":45}' \
  -F 'outputFormat=jpeg')
check "Annotate with rotation" "200" "$out" "JPEG"

# ── 8. Output options ─────────────────────────────────────────────────────────
echo ""
echo "── Output options ──────────────────────────────────────────────────────"

out=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=jpeg' -F 'strip=true' -F 'interlace=true')
check "JPEG strip + interlace (progressive)" "200" "$out" "progressive"

out=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=webp' -F 'losslessWebp=true')
check "Lossless WebP" "200" "$out" "Web/P"

# strip should shrink file size vs non-stripped (EXIF removal)
out_stripped=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=jpeg' -F 'strip=true')
out_full=$(post    -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=jpeg' -F 'strip=false')
check "Strip=true still produces JPEG" "200" "$out_stripped" "JPEG"
stripped_size=$(wc -c < "$out_stripped")
full_size=$(wc -c < "$out_full")
if (( stripped_size <= full_size )); then
  green "  strip=true output ≤ non-stripped (${stripped_size}B ≤ ${full_size}B)"
  PASS=$((PASS+1))
else
  red "  strip=true output larger than non-stripped (${stripped_size}B > ${full_size}B)"
  FAIL=$((FAIL+1))
fi

# Quality: low quality should be smaller than high quality
out_lo=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=jpeg' -F 'quality=1')
out_hi=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=jpeg' -F 'quality=99')
check "quality=1 produces JPEG" "200" "$out_lo" "JPEG"
check "quality=99 produces JPEG" "200" "$out_hi" "JPEG"
lo_size=$(wc -c < "$out_lo")
hi_size=$(wc -c < "$out_hi")
if (( lo_size < hi_size )); then
  green "  quality=1 smaller than quality=99 (${lo_size}B < ${hi_size}B)"
  PASS=$((PASS+1))
else
  red "  quality=1 not smaller than quality=99 (${lo_size}B vs ${hi_size}B)"
  FAIL=$((FAIL+1))
fi

# ── 9. Validation errors ──────────────────────────────────────────────────────
echo ""
echo "── Validation errors ───────────────────────────────────────────────────"

out=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=exe')
check "Bad outputFormat → 400" "400" "$out"

out=$(post -F "file=@$IMAGE" -F 'ops=[1,2,3]' -F 'outputFormat=jpeg')
check "ops is array → 400" "400" "$out"

out=$(post -F "file=@$IMAGE" -F 'ops=null' -F 'outputFormat=jpeg')
check "ops is null → 400" "400" "$out"

out=$(post -F "file=@$IMAGE" -F 'ops="string"' -F 'outputFormat=jpeg')
check "ops is string → 400" "400" "$out"

out=$(post -F "file=@$IMAGE" -F 'ops={}' -F 'outputFormat=jpeg' -F 'quality=999')
check "quality out of range → 400" "400" "$out"

out=$(post -F "file=@$IMAGE" -F 'ops={"resizeWidth":99999}' -F 'outputFormat=jpeg')
check "resizeWidth out of range → 400" "400" "$out"

out=$(post -F "file=@$IMAGE" -F 'ops={"gamma":999}' -F 'outputFormat=jpeg')
check "gamma out of range → 400" "400" "$out"

out=$(post -F "file=@$IMAGE" -F 'ops={"resizeMode":"invalid"}' -F 'outputFormat=jpeg')
check "invalid resizeMode → 400" "400" "$out"

out=$(post -F "file=@$IMAGE" -F 'ops={"gravity":"TopLeft"}' -F 'outputFormat=jpeg')
check "invalid gravity → 400" "400" "$out"

out=$(post -F "file=@$IMAGE" -F 'ops={"colorspace":"CMYK_bad"}' -F 'outputFormat=jpeg')
check "invalid colorspace → 400" "400" "$out"

out=$(post -F "file=@$IMAGE" -F 'ops={"borderColor":"red"}' -F 'outputFormat=jpeg')
check "invalid borderColor (not hex) → 400" "400" "$out"

out=$(post -F "file=@$IMAGE" -F 'ops={"rotateBg":"rgba(0,0,0,1)"}' -F 'outputFormat=jpeg')
check "invalid rotateBg (rgba string) → 400" "400" "$out"

out=$(post -F "file=@$IMAGE" -F 'ops={"annotateText":"bad\ntext"}' -F 'outputFormat=jpeg')
check "annotateText with newline → 400" "400" "$out"

out=$(post -F "file=@$IMAGE" -F 'ops={"__proto__":{"x":1}}' -F 'outputFormat=jpeg')
check "prototype pollution key → 400" "400" "$out"

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

# ── Phase 3: Static / SPA / Headers ──────────────────────────────────────────
echo ""
echo "── Phase 3: Static / SPA / Headers ─────────────────────────────────────"

# Security headers via helmet — verified on any response
phdr=$(curl -sI "$BASE/api/capabilities")
echo "$phdr" | grep -qi "x-content-type-options" \
  && { green "Helmet: X-Content-Type-Options present"; PASS=$((PASS+1)); } \
  || { red   "Helmet: X-Content-Type-Options missing"; FAIL=$((FAIL+1)); }

echo "$phdr" | grep -qi "x-frame-options\|frame-ancestors" \
  && { green "Helmet: frame protection header present"; PASS=$((PASS+1)); } \
  || { red   "Helmet: frame protection header missing"; FAIL=$((FAIL+1)); }

# /api/capabilities → Content-Type: application/json
echo "$phdr" | grep -qi "content-type:.*application/json" \
  && { green "GET /api/capabilities → Content-Type: application/json"; PASS=$((PASS+1)); } \
  || { red   "GET /api/capabilities → Content-Type not application/json"; FAIL=$((FAIL+1)); }

# SPA: root serves the built frontend (production mode)
out=$(get /)
check "GET / → 200" "200" "$out"
grep -qi "<!doctype\|<html\|MagickStudio\|vite" "$out" \
  && { green "GET / body is HTML/SPA"; PASS=$((PASS+1)); } \
  || { red   "GET / body is not HTML/SPA"; FAIL=$((FAIL+1)); }

# SPA fallback: unknown deep route returns index.html
out=$(get /some/nonexistent/spa/route)
check "SPA fallback → 200" "200" "$out"
grep -qi "<!doctype\|<html" "$out" \
  && { green "SPA fallback body is HTML"; PASS=$((PASS+1)); } \
  || { red   "SPA fallback body is not HTML"; FAIL=$((FAIL+1)); }

# POST /api/process sets X-Image-Format and Content-Type headers
phdr=$(curl -s -D - -X POST "$BASE/api/process" \
  -F "file=@$IMAGE"      \
  -F 'ops={}'            \
  -F 'outputFormat=jpeg' \
  -o /dev/null)
echo "$phdr" | grep -qi "x-image-format:" \
  && { green "POST /api/process → X-Image-Format header present"; PASS=$((PASS+1)); } \
  || { red   "POST /api/process → X-Image-Format header missing"; FAIL=$((FAIL+1)); }
echo "$phdr" | grep -qi "content-type:.*image/jpeg" \
  && { green "POST /api/process → Content-Type: image/jpeg"; PASS=$((PASS+1)); } \
  || { red   "POST /api/process → Content-Type not image/jpeg"; FAIL=$((FAIL+1)); }

# 413: file exceeding the default 50 MB upload limit
big=$(mktemp /tmp/big_XXXXXX.jpg)
printf '\xff\xd8\xff\xe0' > "$big"
dd if=/dev/zero bs=1M count=51 >> "$big" 2>/dev/null
out=$(post -F "file=@$big" -F 'ops={}' -F 'outputFormat=jpeg')
check "Oversized file (51 MB) → 413" "413" "$out"
rm -f "$big"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "════════════════════════════════════════════════════════"
echo ""
[[ $FAIL -eq 0 ]]

