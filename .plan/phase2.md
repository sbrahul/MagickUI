# Phase 2 — Backend

**Goal:** Implement the two API endpoints (`/api/capabilities` and `/api/process`) fully.
**Deliverable check:**
- `curl http://localhost:3001/api/capabilities` returns `{ inputFormats: [...], outputFormats: [...] }`
- `curl -F "file=@test.jpg" -F 'ops={}' -F 'outputFormat=png' http://localhost:3001/api/process -o out.png` produces a valid PNG

**Depends on:** Phase 1 complete.

---

## File tree to produce

```
server/
├── index.js             ← replace stubs with real multer upload + magic-byte validation
├── routes/
│   └── process.js       ← /api/process + /api/capabilities (full implementation)
└── lib/
    ├── validate.js      ← whitelist param validation
    └── buildArgs.js     ← magick argument array builder
```

---

## 2.1 `server/lib/validate.js`

Called before `buildArgs` on every request. Returns a clean, clamped `ops` object or throws `{ status: 400, message }`.

### Rules enforced

| Param category | Rule |
|---|---|
| Operation presence | `ops` must be a plain object — array/string/null → 400 |
| Numeric params | `Number(val)`, `isFinite()` check, then clamped to allowed range. Non-finite or out-of-range string → 400 |
| Enum params | Checked against an explicit whitelist array. Unknown value → 400 |
| Free text (annotate) | `/^[\x20-\x7E]{0,500}$/` — printable ASCII only, no newlines, max 500 chars |
| Color params | `/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/` — hex only. rgba() is server-constructed |
| outputFormat | Validated against `['jpeg','png','webp','avif','tiff','gif']` |

### Allowed ops and their param ranges

```js
// Numeric ranges [min, max, default]
const RANGES = {
  // Transform
  resizeWidth:         [1, 16000, null],
  resizeHeight:        [1, 16000, null],
  rotate:              [-360, 360, 0],
  // Color
  brightnessContrastB: [-100, 100, 0],
  brightnessContrastC: [-100, 100, 0],
  modulateBrightness:  [0, 200, 100],
  modulateSaturation:  [0, 200, 100],
  modulateHue:         [0, 200, 100],
  gamma:               [0.1, 10, 1.0],
  levelBlack:          [0, 99, 0],
  levelWhite:          [1, 100, 100],
  levelGamma:          [0.1, 10, 1.0],
  sepiaTone:           [0, 100, 80],
  // Blur/Sharpen
  gaussianBlurSigma:   [0.1, 50, 2],
  sharpenSigma:        [0.1, 20, 1],
  unsharpRadius:       [0, 20, 0],
  unsharpSigma:        [0.1, 20, 1],
  unsharpAmount:       [0, 5, 1],
  unsharpThreshold:    [0, 1, 0.05],
  medianRadius:        [1, 20, 3],
  waveletDenoise:      [0, 30, 5],
  // Effects
  charcoalRadius:      [0, 10, 2],
  embossSigma:         [0.1, 10, 1],
  edgeRadius:          [0, 10, 1],
  sketchSigma:         [0.1, 20, 5],
  sketchAngle:         [-360, 360, 45],
  spreadRadius:        [1, 50, 5],
  swirlAngle:          [-360, 360, 90],
  waveAmplitude:       [1, 200, 25],
  waveWavelength:      [1, 500, 150],
  implodeFactor:       [-3, 3, 0.5],
  posterizeLevels:     [2, 8, 4],
  solarizeThreshold:   [0, 100, 50],
  paintRadius:         [0, 10, 3],
  vignetteSigma:       [0.1, 50, 10],
  // Border
  borderWidth:         [1, 500, 10],
  // Annotate
  annotateSize:        [6, 500, 36],
  annotateOpacity:     [0, 100, 100],
  annotateX:           [-10000, 10000, 10],
  annotateY:           [-10000, 10000, 10],
  annotateRotation:    [-360, 360, 0],
  // Output
  quality:             [1, 100, 85],
}

const GRAVITY_VALUES    = ['NorthWest','North','NorthEast','West','Center','East','SouthWest','South','SouthEast']
const COLORSPACE_VALUES = ['sRGB','Gray','HSL','CMYK','Lab']
const RESIZE_MODES      = ['fit','fill','exact','percent']
```

### `validate(ops, output)` function signature

```js
export function validate(ops, output) {
  // Returns { ops: validatedOps, output: validatedOutput }
  // Throws { status: 400, message: string } on any violation
}
```

---

## 2.2 `server/lib/buildArgs.js`

**Core function:** `buildArgs(ops, inputPath, outputPath) → string[]`

Operations applied in fixed pipeline order (1→10). Each stage checks if the op is present/enabled before adding args.

### Stage 1 — Orientation
```
if ops.autoOrient: ['-auto-orient']
```

### Stage 2 — Crop
Crop params arrive as 0.0–1.0 ratios of original image dimensions.
Server must first run `magick identify -format "%w %h" <inputPath>` to get actual pixel dimensions, then compute:
```
cropW = Math.round(ops.crop.width  * imgW)
cropH = Math.round(ops.crop.height * imgH)
cropX = Math.round(ops.crop.x      * imgW)
cropY = Math.round(ops.crop.y      * imgH)
args: ['-crop', `${cropW}x${cropH}+${cropX}+${cropY}`, '+repage']
```

### Stage 3 — Resize

| resizeMode | args |
|---|---|
| `fit`     | `['-resize', '${w}x${h}']`  |
| `fill`    | `['-resize', '${w}x${h}^', '-gravity', 'Center', '-extent', '${w}x${h}']` |
| `exact`   | `['-resize', '${w}x${h}!']` |
| `percent` | `['-resize', '${w}%']`      |

### Stage 4 — Geometry
```
rotate !== 0:        ['-background', ops.rotateBg || 'none', '-rotate', String(rotate)]
flip:                ['-flip']
flop:                ['-flop']
trim:                ['-trim', '+repage']
```

### Stage 5 — Color / Tone
```
brightnessContrast:  ['-brightness-contrast', `${b}x${c}`]
modulate:            ['-modulate', `${brightness},${saturation},${hue}`]
gamma !== 1.0:       ['-gamma', String(gamma)]
level:               ['-level', `${black}%,${white}%,${gamma}`]
grayscale:           ['-grayscale', 'Rec709Luma']
negate:              ['-negate']
normalize:           ['-normalize']
equalize:            ['-equalize']
whiteBalance:        ['-white-balance']
sepiaTone:           ['-sepia-tone', `${pct}%`]
colorspace:          ['-colorspace', space]
```

### Stage 6 — Blur / Sharpen
```
gaussianBlur:        ['-gaussian-blur', `0x${sigma}`]
sharpen:             ['-sharpen', `0x${sigma}`]
unsharp:             ['-unsharp', `${r}x${s}+${a}+${t}`]
median:              ['-median', String(radius)]
despeckle:           ['-despeckle']
waveletDenoise:      ['-wavelet-denoise', `${pct}%`]
```

### Stage 7 — Effects
```
charcoal:   ['-charcoal', String(radius)]
emboss:     ['-emboss', `0x${sigma}`]
edge:       ['-edge', String(radius)]
sketch:     ['-sketch', `0x${sigma}+${angle}`]
spread:     ['-spread', String(radius)]
swirl:      ['-swirl', String(angle)]
wave:       ['-wave', `${amp}x${wl}`]
implode:    ['-implode', String(factor)]
posterize:  ['-posterize', String(levels)]
solarize:   ['-solarize', `${pct}%`]
paint:      ['-paint', String(radius)]
vignette:   ['-background', 'black', '-vignette', `0x${sigma}`]
```

### Stage 8 — Border
```
border:  ['-bordercolor', color, '-border', `${w}x${w}`]
```

### Stage 9 — Annotate
```
annotate: [
  '-gravity', gravity,
  '-pointsize', String(size),
  '-fill', `rgba(${r},${g},${b},${opacity/100})`,
  '-annotate', `${rotation}+${x}+${y}`,
  text
]
```
Color is passed from client as `#rrggbb` hex. Server parses to R,G,B integers for constructing the `rgba()` fill value. Opacity is a validated 0–100 number.

### Stage 10 — Output
```
strip:                ['-strip']
interlace (jpeg):     ['-interlace', 'JPEG']
losslessWebp:         ['-define', 'webp:lossless=true']
quality:              ['-quality', String(quality)]
outputPath:           outputPath  (e.g. /tmp/<uuid>/output.png)
```

Full assembled call:
```js
['magick', inputPath, ...allArgs, outputPath]
// → spawn('magick', [inputPath, ...allArgs, outputPath])
```

---

## 2.3 `server/routes/process.js`

### `GET /api/capabilities`

Runs once at server startup (not per-request):
```js
import { execFile } from 'child_process'

let cachedCapabilities = null

async function probeCapabilities() {
  return new Promise((resolve) => {
    execFile('magick', ['-list', 'format'], { timeout: 15000 }, (err, stdout) => {
      if (err) { resolve({ inputFormats: [], outputFormats: [] }); return }
      const lines = stdout.split('\n')
      const inputFormats = []
      const outputFormats = []
      const WANTED = { JPEG: true, PNG: true, WEBP: true, AVIF: true, TIFF: true, GIF: true, BMP: true, HEIC: true, HEIF: true }
      for (const line of lines) {
        const match = line.match(/^\s+(\w+)\*?\s+\S+\s+(r|rw|r-|-r|--)\s/i)
        if (!match) continue
        const fmt = match[1].toUpperCase()
        const rw  = match[2].toLowerCase()
        if (!WANTED[fmt]) continue
        if (rw.includes('r')) inputFormats.push(fmt.toLowerCase())
        if (rw.includes('w')) outputFormats.push(fmt.toLowerCase())
      }
      resolve({ inputFormats, outputFormats })
    })
  })
}

// Called in index.js at startup, stored in module-level variable
export async function initCapabilities() {
  cachedCapabilities = await probeCapabilities()
}
export function getCapabilities() { return cachedCapabilities }
```

Route handler:
```js
router.get('/capabilities', (_req, res) => {
  res.json(getCapabilities() ?? { inputFormats: [], outputFormats: [] })
})
```

### `POST /api/process`

Request: `multipart/form-data`
- `file` — the image file (from multer memory storage)
- `ops` — JSON string of the ops object
- `outputFormat` — e.g. `"jpeg"`
- `quality` — e.g. `"85"`
- `strip` — `"true"` / `"false"`
- `interlace` — `"true"` / `"false"`
- `losslessWebp` — `"true"` / `"false"`

```js
import { randomUUID } from 'crypto'
import { mkdir, writeFile, readFile, rm } from 'fs/promises'
import { spawn } from 'child_process'
import { join } from 'path'
import { validate } from '../lib/validate.js'
import { buildArgs } from '../lib/buildArgs.js'

router.post('/process', upload.single('file'), async (req, res) => {
  const tmpDir = join('/tmp', randomUUID())
  try {
    // 1. Parse + validate
    let ops, output
    try {
      ops    = JSON.parse(req.body.ops || '{}')
      output = {
        format:      req.body.outputFormat ?? 'jpeg',
        quality:     Number(req.body.quality ?? 85),
        strip:       req.body.strip === 'true',
        interlace:   req.body.interlace === 'true',
        losslessWebp: req.body.losslessWebp === 'true',
      }
      ;({ ops, output } = validate(ops, output))
    } catch (e) {
      return res.status(e.status ?? 400).json({ message: e.message ?? 'Invalid parameters' })
    }

    // 2. Determine input extension from magic bytes
    const ext    = extensionFromBuffer(req.file.buffer)  // see below
    const inPath = join(tmpDir, `input.${ext}`)
    const outPath= join(tmpDir, `output.${output.format}`)

    // 3. Write uploaded file to tmpdir
    await mkdir(tmpDir, { recursive: true })
    await writeFile(inPath, req.file.buffer)

    // 4. Build args + spawn
    const args = await buildArgs(ops, inPath, outPath, output)
    await new Promise((resolve, reject) => {
      const proc = spawn('magick', args, { timeout: 120_000 })
      let stderr = ''
      proc.stderr.on('data', d => { stderr += d.toString() })
      proc.on('close', code => {
        if (code === 0) resolve()
        else reject({ status: 422, message: 'ImageMagick error', stderr })
      })
      proc.on('error', err => reject({ status: 500, message: err.message, stderr }))
    })

    // 5. Stream result
    const result = await readFile(outPath)
    const mime   = MIME_FROM_FORMAT[output.format] ?? 'application/octet-stream'
    res
      .set('Content-Type', mime)
      .set('X-Image-Format', output.format)
      .send(result)

  } catch (e) {
    res.status(e.status ?? 500).json({ message: e.message, stderr: e.stderr ?? '' })
  } finally {
    rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
})
```

---

## 2.4 `server/index.js` (updated)

Add to skeleton from Phase 1:
- Import `multer` with memory storage and file size limit from `MAX_FILE_SIZE_MB` env var
- Add magic-byte validation as a multer `fileFilter`
- Import + call `initCapabilities()` at startup before `app.listen`
- Register `processRouter` under `/api`

### Magic-byte validation table

```js
function extensionFromBuffer(buf) {
  if (buf[0]===0xFF && buf[1]===0xD8 && buf[2]===0xFF) return 'jpg'
  if (buf[0]===0x89 && buf[1]===0x50 && buf[2]===0x4E && buf[3]===0x47) return 'png'
  if (buf[0]===0x52 && buf[1]===0x49 && buf[2]===0x46 && buf[3]===0x46 &&
      buf[8]===0x57 && buf[9]===0x45 && buf[10]===0x42 && buf[11]===0x50) return 'webp'
  if (buf[0]===0x47 && buf[1]===0x49 && buf[2]===0x46) return 'gif'
  if ((buf[0]===0x49 && buf[1]===0x49 && buf[2]===0x2A) ||
      (buf[0]===0x4D && buf[1]===0x4D && buf[2]===0x00 && buf[3]===0x2A)) return 'tiff'
  if (buf[0]===0x42 && buf[1]===0x4D) return 'bmp'
  // HEIF/HEIC: ftyp box at offset 4
  if (buf[4]===0x66 && buf[5]===0x74 && buf[6]===0x79 && buf[7]===0x70) return 'heic'
  throw { status: 415, message: 'Unsupported image format' }
}
```

Multer `fileFilter` calls `extensionFromBuffer` on a small buffer subset before accepting the file. MIME type must also match an allowlist:
```js
const ALLOWED_MIMES = new Set([
  'image/jpeg','image/png','image/webp','image/gif',
  'image/tiff','image/bmp','image/heic','image/heif','image/avif',
])
```

---

## 2.5 Security summary (implemented here)

| Layer | Where enforced |
|---|---|
| No shell (spawn + args array) | `routes/process.js` spawn call |
| Op whitelist + param validation | `lib/validate.js` |
| policy.xml coder restrictions | Docker image (Phase 1) |
| Per-request tmpdir + finally cleanup | `routes/process.js` finally block |
| Magic-byte upload validation | `index.js` multer fileFilter |
| Non-root Docker user | Dockerfile (Phase 1) |

---

## Verification

```bash
# Dev mode (Phase 1 server must be running on :3001)
cd server && npm run dev

# In another terminal:
curl http://localhost:3001/api/capabilities
# Expected: { inputFormats: ['jpeg','png',...], outputFormats: [...] }

curl -s \
  -F "file=@/path/to/test.jpg" \
  -F 'ops={"resize":{"width":400,"height":300,"mode":"fit"}}' \
  -F "outputFormat=png" \
  -F "quality=90" \
  http://localhost:3001/api/process -o out.png
file out.png   # should say PNG image

# Security test
curl -s \
  -F "file=@/path/to/test.jpg" \
  -F 'ops={"__proto__":{"polluted":"yes"}}' \
  -F "outputFormat=jpeg" \
  http://localhost:3001/api/process
# Expected: 400 response

# Oversized file (create a dummy >50MB file)
dd if=/dev/zero bs=1M count=55 | curl -s \
  -F "file=@/dev/stdin;type=image/jpeg" \
  http://localhost:3001/api/process
# Expected: 413
```
