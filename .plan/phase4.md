# Phase 4 — Operations Tabs

**Goal:** Implement all six tab panels with fully wired controls. Every slider/toggle updates the zustand store; CommandBar updates live.
**Deliverable check:** Each tab's controls cause the command preview bar to update. Apply + download works for each feature.

**Depends on:** Phase 3 complete (store, CommandBar, Sidebar shell all working).

---

## Conventions used throughout

- Import `useImageStore` from `'../store/imageStore.js'` (or `'../../store/imageStore.js'` from tabs/)
- Import UI primitives from `'../ui/...'`
- `updateOp(key, value)` — sets `ops[key]`. Pass `null` to disable an op.
- `updateOutput(key, value)` — sets `output[key]`
- Sliders use the shadcn `Slider` primitive (Radix-based)
- Switches use the shadcn `Switch` primitive (Radix-based)

### Shared `OpSection` wrapper component (add to `ui/op-section.jsx`)

A small layout wrapper for each operation block — label, optional enable/disable toggle, children.

```jsx
// ui/op-section.jsx
export function OpSection({ label, enabled, onToggle, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">{label}</span>
        {onToggle !== undefined && (
          <Switch checked={!!enabled} onCheckedChange={onToggle} />
        )}
      </div>
      {(enabled === undefined || enabled) && children}
    </div>
  )
}
```

### Shared `LabeledSlider` component (add to `ui/labeled-slider.jsx`)

```jsx
// ui/labeled-slider.jsx
export function LabeledSlider({ label, value, onChange, min, max, step = 1, unit = '' }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>{value}{unit}</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} />
    </div>
  )
}
```

---

## 4.1 `TransformTab.jsx`

### Controls

**Auto-orient** (checkbox)
```js
ops.autoOrient → Switch checked/unchecked → updateOp('autoOrient', bool)
```

**Resize**
- Enable toggle → `updateOp('resize', value ? { width: 800, height: 600, mode: 'fit' } : null)`
- When enabled:
  - Mode dropdown: `<select>` with options Fit / Fill / Exact / Percent — `updateOp('resize', { ...ops.resize, mode })`
  - Width input: number, 1–16000
  - Height input: number, 1–16000 (hidden when mode = 'percent')
  - Lock aspect ratio toggle: client-side only — when W changes, auto-update H proportionally using stored original image aspect ratio (read from `originalFile` via an Image object on load)

**Crop**
- Enable toggle → `updateOp('crop', value ? { x: 0, y: 0, width: 1, height: 1 } : null)`
- When enabled: mount `<ReactCrop>` overlaid on a small version of `originalBlobUrl`
  - `ReactCrop` returns pixel coords relative to the displayed image
  - Convert to ratios: `{ x: px/imgW, y: py/imgH, width: pw/imgW, height: ph/imgH }`
  - Store ratios in `updateOp('crop', { x, y, width, height })`
- Show live pixel estimate below crop widget: `"~${Math.round(width*naturalW)} × ${Math.round(height*naturalH)} px"`

**Rotate**
- Quick buttons: `-90` / `+90` / `180` → each calls `updateOp('rotate', (prev + delta) % 360)`
- Free input: `<input type="number" min=-360 max=360>` → `updateOp('rotate', Number(v))`
- Background color for non-rectangular rotations: color picker → `updateOp('rotateBg', hex)`

**Flip / Flop**
- Two Switch toggles: `updateOp('flip', bool)` / `updateOp('flop', bool)`

**Trim borders**
- Switch toggle: `updateOp('trim', bool)`

**Strip metadata**
- Switch (but updates output, not ops): `updateOutput('strip', bool)`

---

## 4.2 `ColorTab.jsx`

All controls are grouped and individually togglable using `OpSection`.

### Brightness / Contrast
- Enable toggle → `updateOp('brightnessContrast', enabled ? { b: 0, c: 0 } : null)`
- `LabeledSlider` for Brightness: −100 to +100
- `LabeledSlider` for Contrast: −100 to +100

### Modulate (Brightness / Saturation / Hue)
- Enable toggle → `updateOp('modulate', enabled ? { brightness: 100, saturation: 100, hue: 100 } : null)`
- Three sliders: Brightness 0–200, Saturation 0–200, Hue 0–200 (default 100 = no change)
- Note: this is a different brightness than `-brightness-contrast`; label it "HSB Adjust" to avoid confusion

### Gamma
- Enable toggle → `updateOp('gamma', enabled ? 1.0 : null)`
- Slider 0.1–10, step 0.05, default 1.0

### Levels
- Enable toggle → `updateOp('level', enabled ? { black: 0, white: 100, gamma: 1.0 } : null)`
- Three sliders: Black point (0–99), White point (1–100), Midtone gamma (0.1–10)

### Toggle group (no enable/disable — they're binary)
| Label | Store key | Action |
|---|---|---|
| Grayscale | `grayscale` | `updateOp('grayscale', bool)` |
| Negate (Invert) | `negate` | `updateOp('negate', bool)` |
| Normalize | `normalize` | `updateOp('normalize', bool)` |
| Equalize | `equalize` | `updateOp('equalize', bool)` |
| White Balance | `whiteBalance` | `updateOp('whiteBalance', bool)` |

Render as a grid of Switch rows.

### Sepia Tone
- Enable toggle → `updateOp('sepiaTone', enabled ? 80 : null)`
- Slider 0–100 when enabled

### Colorspace
- Enable toggle + `<select>` dropdown: sRGB / Gray / HSL / CMYK / Lab
- `updateOp('colorspace', value ?? null)`

---

## 4.3 `BlurTab.jsx`

Uses sub-tabs (Blur / Sharpen) within this tab to prevent contradictory ops being active simultaneously. Use the `Tabs` primitive with values `'blur'` and `'sharpen'`. When user switches sub-tab, null out the ops from the other sub-tab.

### Blur sub-tab

**Gaussian Blur**
- Enable toggle → `updateOp('gaussianBlur', enabled ? { sigma: 2 } : null)` & null out sharpen/unsharp
- Slider: sigma 0.1–50, step 0.1

**Median filter**
- Enable toggle → `updateOp('median', enabled ? { radius: 3 } : null)`
- Slider: radius 1–20

**Wavelet Denoise**
- Enable toggle → `updateOp('waveletDenoise', enabled ? { threshold: 5 } : null)`
- Slider: threshold 0–30, step 0.5

**Despeckle**
- Switch: `updateOp('despeckle', bool)`

### Sharpen sub-tab

**Sharpen**
- Enable toggle → `updateOp('sharpen', enabled ? { sigma: 1 } : null)` & null out blur ops
- Slider: sigma 0.1–20, step 0.1

**Unsharp Mask**
- Enable toggle → `updateOp('unsharp', enabled ? { radius: 0, sigma: 1, amount: 1, threshold: 0.05 } : null)`
- Four sliders:
  - Radius: 0–20, step 0.5
  - Sigma: 0.1–20, step 0.1
  - Amount: 0–5, step 0.1
  - Threshold: 0–1, step 0.01

---

## 4.4 `EffectsTab.jsx`

Grid of effect cards — 2 columns on desktop, 1 on mobile. Each card has:
- Title + enable Switch top-right
- Sliders shown only when enabled
- Visual icon or emoji for quick recognition

| Effect | Store key | Enable default | Sliders |
|---|---|---|---|
| Charcoal | `charcoal` | `{ radius: 2 }` | Radius 0–10 |
| Emboss | `emboss` | `{ sigma: 1 }` | Sigma 0.1–10 |
| Edge Detect | `edge` | `{ radius: 1 }` | Radius 0–10 |
| Sketch | `sketch` | `{ sigma: 5, angle: 45 }` | Sigma 0.1–20, Angle −360–360 |
| Spread | `spread` | `{ radius: 5 }` | Radius 1–50 |
| Swirl | `swirl` | `{ angle: 90 }` | Angle −360–360 |
| Wave | `wave` | `{ amplitude: 25, wavelength: 150 }` | Amplitude 1–200, Wavelength 1–500 |
| Implode/Explode | `implode` | `{ factor: 0.5 }` | Factor −3–3 (negative = explode) |
| Posterize | `posterize` | `{ levels: 4 }` | Levels 2–8, step 1 |
| Solarize | `solarize` | `{ threshold: 50 }` | Threshold 0–100 |
| Oil Paint | `paint` | `{ radius: 3 }` | Radius 0–10 |
| Vignette | `vignette` | `{ sigma: 10 }` | Sigma 0.1–50 |

Each card: `updateOp(key, enabled ? defaultValue : null)`

---

## 4.5 `AnnotateTab.jsx`

### Text input
```jsx
<textarea
  maxLength={500}
  placeholder="Watermark text…"
  value={ops.annotate?.text ?? ''}
  onChange={e => updateOp('annotate', { ...defaults, ...ops.annotate, text: e.target.value })}
  className="w-full rounded bg-white/10 px-3 py-2 text-sm resize-none"
  rows={2}
/>
```
Enable/disable: annotate is null when text is empty, set to defaults when user types first character.

### Gravity grid (3×3 visual picker)
Nine buttons arranged in a 3×3 CSS grid. Highlights the active one.
```
NW | N | NE
W  | C | E
SW | S | SE
```
Maps to ImageMagick values: `NorthWest`, `North`, `NorthEast`, `West`, `Center`, `East`, `SouthWest`, `South`, `SouthEast`

### Font size
`LabeledSlider` — 6 to 500, default 36

### Font colour
`react-colorful` `HexColorPicker` component. Show hex input below picker. Default `#ffffff`.

### Opacity
`LabeledSlider` — 0 to 100, default 100, unit `%`

### X / Y offset
Two `<input type="number">` fields, range −5000 to 5000, default 10/10

### Text rotation
`LabeledSlider` — −360 to 360, default 0

### Border (optional — separate from main annotate)
Enable toggle → `updateOp('border', enabled ? { width: 10, color: '#000000' } : null)`
- Width slider: 1–500
- Color picker: `HexColorPicker`

Defaults for new annotate object:
```js
const ANNOTATE_DEFAULTS = {
  text: '', gravity: 'SouthEast', size: 36,
  color: '#ffffff', opacity: 100, x: 10, y: 10, rotation: 0,
}
```

---

## 4.6 `OutputTab.jsx`

```jsx
import { useImageStore } from '../../store/imageStore.js'

const FORMATS = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png',  label: 'PNG'  },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'tiff', label: 'TIFF' },
  { value: 'gif',  label: 'GIF'  },
]

export function OutputTab() {
  const output       = useImageStore(s => s.output)
  const updateOutput = useImageStore(s => s.updateOutput)
  const capabilities = useImageStore(s => s.capabilities)
  const processedBlobUrl = useImageStore(s => s.processedBlobUrl)
  const processedMeta    = useImageStore(s => s.processedMeta)

  const supported = capabilities?.outputFormats ?? []

  return (
    <div className="space-y-5">
      {/* Format selector */}
      <OpSection label="Output Format">
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map(f => {
            const available = supported.length === 0 || supported.includes(f.value)
            return (
              <button
                key={f.value}
                disabled={!available}
                onClick={() => updateOutput('format', f.value)}
                className={cn(
                  'py-1.5 rounded text-sm border transition-colors',
                  output.format === f.value
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : available
                    ? 'border-white/20 text-gray-300 hover:border-white/50'
                    : 'border-white/10 text-gray-600 cursor-not-allowed opacity-40'
                )}
                title={!available ? 'Not supported by this ImageMagick build' : undefined}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </OpSection>

      {/* Quality (JPEG / WebP / AVIF only) */}
      {['jpeg','webp','avif'].includes(output.format) && (
        <LabeledSlider label="Quality" value={output.quality}
          onChange={v => updateOutput('quality', v)} min={1} max={100} />
      )}

      {/* Progressive JPEG */}
      {output.format === 'jpeg' && (
        <OpSection label="Progressive JPEG">
          <Switch checked={output.interlace} onCheckedChange={v => updateOutput('interlace', v)} />
        </OpSection>
      )}

      {/* Lossless WebP */}
      {output.format === 'webp' && (
        <OpSection label="Lossless WebP">
          <Switch checked={output.losslessWebp} onCheckedChange={v => updateOutput('losslessWebp', v)} />
        </OpSection>
      )}

      {/* Strip metadata */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-300">Strip metadata (EXIF, ICC)</span>
        <Switch checked={output.strip} onCheckedChange={v => updateOutput('strip', v)} />
      </div>

      {/* Download button (only if processed result exists) */}
      {processedBlobUrl && (
        <a
          href={processedBlobUrl}
          download={`output.${output.format}`}
          className="flex items-center justify-center gap-2 w-full py-2 rounded bg-green-700 hover:bg-green-600 text-white text-sm font-medium"
        >
          Download output.{output.format}
          {processedMeta && <span className="text-green-300 text-xs">({(processedMeta.sizeBytes/1024).toFixed(1)} KB)</span>}
        </a>
      )}
    </div>
  )
}
```

---

## Verification

```bash
# With Vite dev server and backend running:

# 1. Transform tab
#    - Enable resize, set 400×300 Fit → CommandBar shows "-resize 400x300"
#    - Enable crop overlay → draw crop region → CommandBar shows "-crop ..."
#    - Rotate +90 → CommandBar shows "-rotate 90"
#    - Flip + Flop both on → CommandBar shows "-flip -flop"

# 2. Color tab
#    - Brightness -50, Contrast +20 → CommandBar shows "-brightness-contrast -50x20"
#    - Enable Sepia 80% → CommandBar shows "-sepia-tone 80%"
#    - Grayscale on → CommandBar shows "-grayscale Rec709Luma"

# 3. Blur tab
#    - Gaussian Blur sigma 3 → CommandBar shows "-gaussian-blur 0x3"
#    - Switch to Sharpen sub-tab → Gaussian Blur nulled out
#    - Unsharp Mask → CommandBar shows "-unsharp ..."

# 4. Effects tab
#    - Enable Swirl 90 → CommandBar shows "-swirl 90"
#    - Enable Vignette → CommandBar shows "-background black -vignette 0x10"

# 5. Annotate tab
#    - Type "Hello" → enable, SouthEast gravity → CommandBar shows "-gravity SouthEast -annotate ..."

# 6. Output tab
#    - Switch to WebP → Quality slider shows
#    - Enable Lossless WebP → CommandBar shows "-define webp:lossless=true"
#    - After Apply: Download button appears

# 7. Apply each tab's settings with a real image → server processes, preview updates
```
