# Phase 3 — Frontend: State, Upload & Layout Shell

**Goal:** Working React app with image upload, zustand store wired, before/after preview, CommandBar, and the full desktop/mobile layout shell. Tabs are present but empty — filled in Phase 4.
**Deliverable check:** Upload an image → thumbnail shows → "MagickStudio" app layout renders with sidebar tabs visible.

**Depends on:** Phase 1 complete (Vite dev server running), Phase 2 `/api/capabilities` working.

---

## File tree to produce

```
client/src/
├── App.jsx                         ← full layout (sidebar + preview + commandbar)
├── store/
│   └── imageStore.js               ← zustand store
├── api/
│   └── client.js                   ← processImage()
├── lib/
│   ├── buildCommand.js             ← live command string builder (display only)
│   └── utils.js                    ← cn() (already done in Phase 1)
└── components/
    ├── UploadZone.jsx
    ├── PreviewPanel.jsx
    ├── CommandBar.jsx
    ├── Sidebar.jsx                 ← tab shell (empty tab panels)
    └── ui/                         ← hand-written shadcn-style primitives
        ├── button.jsx
        ├── slider.jsx
        ├── switch.jsx
        ├── tabs.jsx
        └── sheet.jsx               ← Radix Sheet for mobile bottom drawer
```

---

## 3.1 `client/src/store/imageStore.js`

Uses zustand `create` with a single flat store. No slices needed at this scale.

```js
import { create } from 'zustand'

const DEFAULT_OPS = {
  autoOrient: false,
  crop: null,                 // { x, y, width, height } as 0.0–1.0 ratios, or null
  resize: null,               // { width, height, mode: 'fit'|'fill'|'exact'|'percent' }, or null
  rotate: 0,
  rotateBg: '#000000',
  flip: false,
  flop: false,
  trim: false,
  brightnessContrast: null,   // { b: 0, c: 0 } or null (null = disabled)
  modulate: null,             // { brightness: 100, saturation: 100, hue: 100 } or null
  gamma: null,                // number or null
  level: null,                // { black: 0, white: 100, gamma: 1.0 } or null
  grayscale: false,
  negate: false,
  normalize: false,
  equalize: false,
  whiteBalance: false,
  sepiaTone: null,            // number (0–100) or null
  colorspace: null,           // string or null
  gaussianBlur: null,         // { sigma } or null
  sharpen: null,              // { sigma } or null
  unsharp: null,              // { radius, sigma, amount, threshold } or null
  median: null,               // { radius } or null
  despeckle: false,
  waveletDenoise: null,       // { threshold } or null
  charcoal: null,             // { radius } or null
  emboss: null,               // { sigma } or null
  edge: null,                 // { radius } or null
  sketch: null,               // { sigma, angle } or null
  spread: null,               // { radius } or null
  swirl: null,                // { angle } or null
  wave: null,                 // { amplitude, wavelength } or null
  implode: null,              // { factor } or null
  posterize: null,            // { levels } or null
  solarize: null,             // { threshold } or null
  paint: null,                // { radius } or null
  vignette: null,             // { sigma } or null
  border: null,               // { width, color } or null
  annotate: null,             // { text, gravity, size, color, opacity, x, y, rotation } or null
}

const DEFAULT_OUTPUT = {
  format: 'jpeg',
  quality: 85,
  strip: false,
  interlace: false,
  losslessWebp: false,
}

export const useImageStore = create((set, get) => ({
  // File state
  originalFile: null,
  originalBlobUrl: null,
  processedBlobUrl: null,
  processedMeta: null,       // { format, sizeBytes, width?, height? }
  isProcessing: false,
  abortController: null,
  errorDetail: null,         // { message, stderr } from failed process

  // App state
  capabilities: null,        // { inputFormats, outputFormats }
  showOriginal: true,        // toggle for before/after in PreviewPanel

  // Operations
  ops: { ...DEFAULT_OPS },
  output: { ...DEFAULT_OUTPUT },

  // ── Actions ──────────────────────────────────────────────────

  setFile(file) {
    const prev = get().originalBlobUrl
    if (prev) URL.revokeObjectURL(prev)
    const prevP = get().processedBlobUrl
    if (prevP) URL.revokeObjectURL(prevP)
    set({
      originalFile: file,
      originalBlobUrl: URL.createObjectURL(file),
      processedBlobUrl: null,
      processedMeta: null,
      showOriginal: true,
      errorDetail: null,
      ops: { ...DEFAULT_OPS },
    })
  },

  setCapabilities(caps) { set({ capabilities: caps }) },

  updateOp(key, value) {
    set(state => ({ ops: { ...state.ops, [key]: value } }))
  },

  updateOutput(key, value) {
    set(state => ({ output: { ...state.output, [key]: value } }))
  },

  resetOps() {
    set(state => ({
      ops: { ...DEFAULT_OPS },
      processedBlobUrl: state.processedBlobUrl,
      showOriginal: true,
    }))
  },

  setProcessing(isProcessing, abortController = null) {
    set({ isProcessing, abortController })
  },

  setProcessed(blobUrl, meta) {
    const prev = get().processedBlobUrl
    if (prev) URL.revokeObjectURL(prev)
    set({ processedBlobUrl: blobUrl, processedMeta: meta, showOriginal: false, errorDetail: null })
  },

  setError(errorDetail) {
    set({ errorDetail, isProcessing: false, abortController: null })
  },

  togglePreview() {
    set(state => ({
      showOriginal: state.processedBlobUrl ? !state.showOriginal : true,
    }))
  },
}))
```

---

## 3.2 `client/src/api/client.js`

```js
/**
 * Sends the original file + current ops to /api/process.
 * Returns { blobUrl: string, meta: { format, sizeBytes } }
 * Throws { message, stderr } on error; throws DOMException name='AbortError' on cancel.
 */
export async function processImage({ file, ops, output, signal }) {
  const form = new FormData()
  form.append('file', file)
  form.append('ops', JSON.stringify(ops))
  form.append('outputFormat',  output.format)
  form.append('quality',       String(output.quality))
  form.append('strip',         String(output.strip))
  form.append('interlace',     String(output.interlace))
  form.append('losslessWebp',  String(output.losslessWebp))

  const res = await fetch('/api/process', { method: 'POST', body: form, signal })

  if (!res.ok) {
    let body = {}
    try { body = await res.json() } catch {}
    throw { message: body.message ?? `Server error ${res.status}`, stderr: body.stderr ?? '' }
  }

  const blob    = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const meta    = {
    format:    output.format,
    sizeBytes: blob.size,
  }
  return { blobUrl, meta }
}

export async function fetchCapabilities() {
  const res = await fetch('/api/capabilities')
  if (!res.ok) return { inputFormats: [], outputFormats: [] }
  return res.json()
}
```

---

## 3.3 `client/src/lib/buildCommand.js`

A display-only function that mirrors the server's `buildArgs` logic but produces a human-readable shell string instead of an args array. Updated in sync with Phase 4 operations.

```js
/**
 * Returns a string like:
 *   magick input.jpg -resize 800x600 -quality 85 output.png
 */
export function buildCommand(ops, output, inputExt = 'jpg') {
  const parts = [`magick input.${inputExt}`]

  if (ops.autoOrient) parts.push('-auto-orient')

  if (ops.crop) {
    const { x, y, width, height } = ops.crop
    // Display as percentages since actual pixel dims are unknown client-side
    parts.push(`-crop ${(width*100).toFixed(0)}%x${(height*100).toFixed(0)}%+${(x*100).toFixed(0)}%+${(y*100).toFixed(0)}% +repage`)
  }

  if (ops.resize) {
    const { width, height, mode } = ops.resize
    const modeFlag = { fit: '', fill: '^', exact: '!', percent: '%' }[mode] ?? ''
    if (mode === 'percent') parts.push(`-resize ${width}%`)
    else parts.push(`-resize ${width ?? ''}x${height ?? ''}${modeFlag}`)
  }

  if (ops.rotate !== 0) parts.push(`-rotate ${ops.rotate}`)
  if (ops.flip) parts.push('-flip')
  if (ops.flop) parts.push('-flop')
  if (ops.trim) parts.push('-trim +repage')

  if (ops.brightnessContrast) parts.push(`-brightness-contrast ${ops.brightnessContrast.b}x${ops.brightnessContrast.c}`)
  if (ops.modulate) parts.push(`-modulate ${ops.modulate.brightness},${ops.modulate.saturation},${ops.modulate.hue}`)
  if (ops.gamma !== null && ops.gamma !== undefined) parts.push(`-gamma ${ops.gamma}`)
  if (ops.level) parts.push(`-level ${ops.level.black}%,${ops.level.white}%,${ops.level.gamma}`)
  if (ops.grayscale) parts.push('-grayscale Rec709Luma')
  if (ops.negate) parts.push('-negate')
  if (ops.normalize) parts.push('-normalize')
  if (ops.equalize) parts.push('-equalize')
  if (ops.whiteBalance) parts.push('-white-balance')
  if (ops.sepiaTone !== null && ops.sepiaTone !== undefined) parts.push(`-sepia-tone ${ops.sepiaTone}%`)
  if (ops.colorspace) parts.push(`-colorspace ${ops.colorspace}`)

  if (ops.gaussianBlur) parts.push(`-gaussian-blur 0x${ops.gaussianBlur.sigma}`)
  if (ops.sharpen) parts.push(`-sharpen 0x${ops.sharpen.sigma}`)
  if (ops.unsharp) {
    const { radius: r, sigma: s, amount: a, threshold: t } = ops.unsharp
    parts.push(`-unsharp ${r}x${s}+${a}+${t}`)
  }
  if (ops.median) parts.push(`-median ${ops.median.radius}`)
  if (ops.despeckle) parts.push('-despeckle')
  if (ops.waveletDenoise) parts.push(`-wavelet-denoise ${ops.waveletDenoise.threshold}%`)

  if (ops.charcoal) parts.push(`-charcoal ${ops.charcoal.radius}`)
  if (ops.emboss) parts.push(`-emboss 0x${ops.emboss.sigma}`)
  if (ops.edge) parts.push(`-edge ${ops.edge.radius}`)
  if (ops.sketch) parts.push(`-sketch 0x${ops.sketch.sigma}+${ops.sketch.angle}`)
  if (ops.spread) parts.push(`-spread ${ops.spread.radius}`)
  if (ops.swirl) parts.push(`-swirl ${ops.swirl.angle}`)
  if (ops.wave) parts.push(`-wave ${ops.wave.amplitude}x${ops.wave.wavelength}`)
  if (ops.implode) parts.push(`-implode ${ops.implode.factor}`)
  if (ops.posterize) parts.push(`-posterize ${ops.posterize.levels}`)
  if (ops.solarize) parts.push(`-solarize ${ops.solarize.threshold}%`)
  if (ops.paint) parts.push(`-paint ${ops.paint.radius}`)
  if (ops.vignette) parts.push(`-background black -vignette 0x${ops.vignette.sigma}`)

  if (ops.border) parts.push(`-bordercolor "${ops.border.color}" -border ${ops.border.width}x${ops.border.width}`)

  if (ops.annotate) {
    const { text, gravity, size, color, opacity, x, y, rotation } = ops.annotate
    const alpha = (opacity / 100).toFixed(2)
    parts.push(`-gravity ${gravity} -pointsize ${size} -fill "rgba(0,0,0,${alpha})" -annotate ${rotation}+${x}+${y} "${text}"`)
  }

  if (output.strip) parts.push('-strip')
  if (output.interlace && output.format === 'jpeg') parts.push('-interlace JPEG')
  if (output.losslessWebp && output.format === 'webp') parts.push('-define webp:lossless=true')
  if (['jpeg','webp','avif'].includes(output.format)) parts.push(`-quality ${output.quality}`)

  parts.push(`output.${output.format}`)
  return parts.join(' ')
}
```

---

## 3.4 `client/src/components/ui/` primitives

Hand-write minimal Radix-based components. Keep them simple — just enough to support this app.

### `ui/button.jsx`
Variant-based button: `variant` prop accepts `'default' | 'ghost' | 'destructive'`. Uses `cn()` for class merging. Forwards all HTML button props.

### `ui/slider.jsx`
Wraps `@radix-ui/react-slider` (add to package.json: `@radix-ui/react-slider`). Accepts `value`, `onValueChange`, `min`, `max`, `step`, `disabled`. Styled with Tailwind.

### `ui/switch.jsx`
Wraps `@radix-ui/react-switch`. Accepts `checked`, `onCheckedChange`, `disabled`.

### `ui/tabs.jsx`
Wraps `@radix-ui/react-tabs`. Exports `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.

### `ui/sheet.jsx`
Wraps `@radix-ui/react-dialog` (used as a bottom sheet on mobile). Exports `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`.

Add Radix deps to `client/package.json`:
```json
"@radix-ui/react-slider": "^1.2.2",
"@radix-ui/react-switch": "^1.1.3",
"@radix-ui/react-tabs":   "^1.1.3",
"@radix-ui/react-dialog": "^1.1.5"
```

---

## 3.5 `client/src/components/UploadZone.jsx`

```jsx
import { useDropzone } from 'react-dropzone'
import { useImageStore } from '../store/imageStore.js'
import { Upload } from 'lucide-react'
import { cn } from '../lib/utils.js'

const ACCEPTED = {
  'image/jpeg':  ['.jpg','.jpeg'],
  'image/png':   ['.png'],
  'image/webp':  ['.webp'],
  'image/gif':   ['.gif'],
  'image/tiff':  ['.tiff','.tif'],
  'image/bmp':   ['.bmp'],
  'image/heic':  ['.heic','.heif'],
  'image/heif':  ['.heif'],
  'image/avif':  ['.avif'],
}

export function UploadZone() {
  const setFile       = useImageStore(s => s.setFile)
  const originalFile  = useImageStore(s => s.originalFile)
  const originalBlobUrl = useImageStore(s => s.originalBlobUrl)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED,
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    onDropAccepted: ([file]) => setFile(file),
  })

  if (originalFile) {
    return (
      <div className="flex items-center gap-3 p-3 border border-white/10 rounded-lg bg-white/5">
        <img src={originalBlobUrl} alt="original" className="h-14 w-14 rounded object-cover" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{originalFile.name}</p>
          <p className="text-xs text-gray-400">{(originalFile.size / 1024).toFixed(0)} KB</p>
        </div>
        <button
          onClick={() => setFile(null /* triggers reset inside store */)}
          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded"
        >
          Replace
        </button>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors',
        isDragActive
          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
          : 'border-white/20 hover:border-white/40 text-gray-400'
      )}
    >
      <input {...getInputProps()} />
      <Upload size={32} />
      <p className="text-sm text-center">
        Drop an image here, or <span className="underline">browse</span>
      </p>
      <p className="text-xs">JPEG, PNG, WebP, HEIC, AVIF, GIF, TIFF — max 50 MB</p>
    </div>
  )
}
```

---

## 3.6 `client/src/components/PreviewPanel.jsx`

```jsx
import { motion, AnimatePresence } from 'framer-motion'
import { useImageStore } from '../store/imageStore.js'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'

export function PreviewPanel() {
  const originalBlobUrl  = useImageStore(s => s.originalBlobUrl)
  const processedBlobUrl = useImageStore(s => s.processedBlobUrl)
  const processedMeta    = useImageStore(s => s.processedMeta)
  const showOriginal     = useImageStore(s => s.showOriginal)
  const isProcessing     = useImageStore(s => s.isProcessing)
  const togglePreview    = useImageStore(s => s.togglePreview)
  const [zoom, setZoom]  = useState(1)

  const src = showOriginal ? originalBlobUrl : processedBlobUrl

  if (!originalBlobUrl) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm select-none">
        Upload an image to get started
      </div>
    )
  }

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden bg-[#111] rounded-xl">
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex gap-1">
        <button onClick={() => setZoom(z => Math.min(z + 0.25, 4))}
          className="p-1.5 rounded bg-black/50 hover:bg-black/80 text-white"><ZoomIn size={16}/></button>
        <button onClick={() => setZoom(1)}
          className="px-2 py-1 rounded bg-black/50 hover:bg-black/80 text-white text-xs">{Math.round(zoom*100)}%</button>
        <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
          className="p-1.5 rounded bg-black/50 hover:bg-black/80 text-white"><ZoomOut size={16}/></button>
      </div>

      {/* Before/After toggle badge */}
      {processedBlobUrl && (
        <button
          onClick={togglePreview}
          className="absolute top-3 left-3 z-10 px-2 py-1 rounded bg-black/60 text-xs text-white hover:bg-black/80"
        >
          {showOriginal ? 'Before' : 'After'} · click to toggle
        </button>
      )}

      {/* Image with fade transition */}
      <div className="flex-1 overflow-auto flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img
            key={src}
            src={src}
            alt={showOriginal ? 'original' : 'processed'}
            onClick={processedBlobUrl ? togglePreview : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center', cursor: processedBlobUrl ? 'pointer' : 'default' }}
            className="max-w-full max-h-full object-contain rounded"
          />
        </AnimatePresence>
      </div>

      {/* Meta bar */}
      {!showOriginal && processedMeta && (
        <div className="px-4 py-2 bg-black/40 text-xs text-gray-400 flex gap-4">
          <span>{processedMeta.format?.toUpperCase()}</span>
          <span>{(processedMeta.sizeBytes / 1024).toFixed(1)} KB</span>
        </div>
      )}

      {/* Loading overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl"
          >
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

## 3.7 `client/src/components/CommandBar.jsx`

```jsx
import { useImageStore } from '../store/imageStore.js'
import { buildCommand } from '../lib/buildCommand.js'
import { processImage } from '../api/client.js'
import { toast } from 'sonner'
import { Copy, Play, X } from 'lucide-react'

export function CommandBar() {
  const { originalFile, ops, output, isProcessing, abortController,
          setProcessing, setProcessed, setError } = useImageStore()

  const ext = originalFile?.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const cmd = buildCommand(ops, output, ext)

  async function handleApply() {
    if (!originalFile || isProcessing) return
    const ac = new AbortController()
    setProcessing(true, ac)
    toast.loading('Processing…', { id: 'process' })
    try {
      const { blobUrl, meta } = await processImage({
        file: originalFile, ops, output, signal: ac.signal,
      })
      setProcessed(blobUrl, meta)
      useImageStore.getState().setProcessing(false, null)
      toast.success('Done!', { id: 'process' })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        toast.dismiss('process')
        useImageStore.getState().setProcessing(false, null)
      } else {
        setError({ message: e.message, stderr: e.stderr ?? '' })
        toast.error(e.message ?? 'Processing failed', { id: 'process' })
      }
    }
  }

  function handleCancel() {
    abortController?.abort()
  }

  function handleCopy() {
    navigator.clipboard.writeText(cmd)
    toast.success('Copied!')
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-t border-white/10 text-sm font-mono">
      <span className="flex-1 truncate text-gray-400 min-w-0 hidden md:block">$ {cmd}</span>
      <button onClick={handleCopy} title="Copy command"
        className="p-2 rounded hover:bg-white/10 text-gray-400 hover:text-white flex-shrink-0">
        <Copy size={15} />
      </button>
      {isProcessing ? (
        <button onClick={handleCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-sans">
          <X size={14} /> Cancel
        </button>
      ) : (
        <button
          onClick={handleApply}
          disabled={!originalFile}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-sans"
        >
          <Play size={14} /> Apply
        </button>
      )}
    </div>
  )
}
```

---

## 3.8 `client/src/components/Sidebar.jsx`

Tab container — renders `TransformTab`, `ColorTab`, `BlurTab`, `EffectsTab`, `AnnotateTab`, `OutputTab`. In Phase 3 each tab is just a `<div>Coming soon</div>` placeholder.

```jsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs.jsx'
import { TransformTab } from './tabs/TransformTab.jsx'
import { ColorTab }     from './tabs/ColorTab.jsx'
import { BlurTab }      from './tabs/BlurTab.jsx'
import { EffectsTab }   from './tabs/EffectsTab.jsx'
import { AnnotateTab }  from './tabs/AnnotateTab.jsx'
import { OutputTab }    from './tabs/OutputTab.jsx'
import { useImageStore } from '../store/imageStore.js'
import { UploadZone }  from './UploadZone.jsx'

const TABS = [
  { id: 'transform', label: 'Transform',  Component: TransformTab },
  { id: 'color',     label: 'Color',      Component: ColorTab     },
  { id: 'blur',      label: 'Blur',       Component: BlurTab      },
  { id: 'effects',   label: 'Effects',    Component: EffectsTab   },
  { id: 'annotate',  label: 'Annotate',   Component: AnnotateTab  },
  { id: 'output',    label: 'Output',     Component: OutputTab    },
]

export function Sidebar() {
  const errorDetail = useImageStore(s => s.errorDetail)
  const resetOps    = useImageStore(s => s.resetOps)

  return (
    <aside className="w-80 flex-shrink-0 flex flex-col bg-gray-900 border-r border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <UploadZone />
      </div>

      <Tabs defaultValue="transform" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="flex px-2 pt-2 gap-1 bg-transparent flex-wrap">
          {TABS.map(t => (
            <TabsTrigger key={t.id} value={t.id}
              className="text-xs px-2 py-1 rounded data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 hover:text-white">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {TABS.map(({ id, Component }) => (
            <TabsContent key={id} value={id} className="p-4 space-y-4">
              <Component />
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* Reset button */}
      <div className="p-3 border-t border-white/10">
        <button onClick={resetOps}
          className="w-full py-1.5 rounded text-sm text-gray-400 hover:text-white hover:bg-white/10">
          Reset all settings
        </button>
      </div>

      {/* Error detail panel */}
      {errorDetail && (
        <div className="p-3 border-t border-red-900/50 bg-red-950/30 text-xs text-red-300 max-h-32 overflow-y-auto font-mono whitespace-pre-wrap">
          {errorDetail.stderr || errorDetail.message}
        </div>
      )}
    </aside>
  )
}
```

---

## 3.9 `client/src/App.jsx` (full layout)

```jsx
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { Sidebar } from './components/Sidebar.jsx'
import { PreviewPanel } from './components/PreviewPanel.jsx'
import { CommandBar } from './components/CommandBar.jsx'
import { useImageStore } from './store/imageStore.js'
import { fetchCapabilities } from './api/client.js'

export default function App() {
  const setCapabilities = useImageStore(s => s.setCapabilities)

  useEffect(() => {
    fetchCapabilities().then(setCapabilities)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center px-4 h-12 border-b border-white/10 flex-shrink-0">
        <span className="font-bold tracking-tight">MagickStudio</span>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar (hidden on mobile) */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Preview */}
        <main className="flex-1 flex flex-col overflow-hidden p-3">
          <PreviewPanel />
        </main>
      </div>

      {/* CommandBar */}
      <CommandBar />

      <Toaster theme="dark" position="bottom-center" />
    </div>
  )
}
```

Mobile bottom-sheet for the Sidebar (FAB + Sheet) is added in Phase 5 polish once tabs are filled.

---

## Verification

```bash
cd client && npm run dev   # :5173

# In browser:
# 1. Open http://localhost:5173
# 2. Drag an image onto the upload zone → thumbnail appears
# 3. Tab bar visible: Transform | Color | Blur | Effects | Annotate | Output
# 4. CommandBar at bottom shows "$ magick input.jpg output.jpeg"
# 5. Click Apply with Phase 2 backend running → processes and shows result
# 6. Click image → toggles before/after with fade
# 7. Zoom buttons work (CSS scale)
```
