# Phase 5 — Apply Flow, Mobile, Polish & Verification

**Goal:** Complete the mobile experience (bottom sheet + FAB), dark mode, responsive layout, error display, and run all verification tests.
**Deliverable check:** Full end-to-end test matrix passes; Podman build produces a working production image.

**Depends on:** Phases 1–4 complete.

---

## 5.1 Mobile Bottom Sheet (Framer Motion)

On `< md` breakpoint the sidebar is hidden. Add a floating action button (FAB) that opens a Framer Motion bottom sheet containing the full `<Sidebar />`.

### Create `components/MobileSheet.jsx`

```jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, X } from 'lucide-react'
import { Sidebar } from './Sidebar.jsx'

export function MobileSheet() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 p-4 rounded-full bg-blue-600 shadow-lg text-white"
        aria-label="Open editing panel"
      >
        <SlidersHorizontal size={20} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/60"
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-gray-900 max-h-[85vh] flex flex-col"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              onDragEnd={(_, info) => { if (info.offset.y > 120) setOpen(false) }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3 right-4 p-1 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
              <div className="flex-1 overflow-y-auto">
                <Sidebar />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
```

### Update `App.jsx`

Add `<MobileSheet />` to App:

```jsx
// In App.jsx after <main>...</main>:
<MobileSheet />
```

---

## 5.2 Dark Mode

Tailwind v4 uses CSS-first configuration. The app already uses `bg-gray-950`, `text-white`, etc. — it's dark by default.

Add a **theme toggle** button in the header for users who want light mode:

```jsx
// In App.jsx header:
import { Moon, Sun } from 'lucide-react'
import { useState, useEffect } from 'react'

function ThemeToggle() {
  const [dark, setDark] = useState(true)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])
  return (
    <button onClick={() => setDark(d => !d)} className="ml-auto p-2 rounded hover:bg-white/10 text-gray-400">
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
```

In `index.css` add light-mode overrides using Tailwind v4's `@variant`:
```css
@import "tailwindcss";

:root { color-scheme: dark; }

/* Light mode overrides applied via .light class on <html> */
.light {
  color-scheme: light;
  --background: #f8f9fa;
  --foreground: #1a1a2e;
}
```

Since the app is primarily dark-themed by default, light mode is a bonus — implement only if the above CSS approach is clean. Otherwise skip.

---

## 5.3 CommandBar Mobile Adaptation

On mobile (< md), the command text is hidden and only the Apply/Cancel buttons show. Add an expand icon to open the full command in a bottom sheet.

Update `CommandBar.jsx`:

```jsx
// In the command text section:
<span className="flex-1 truncate text-gray-400 min-w-0 hidden md:block">$ {cmd}</span>

// Add mobile expand button after it:
<button
  onClick={() => setCommandOpen(true)}
  className="md:hidden p-2 rounded hover:bg-white/10 text-gray-400"
  title="View full command"
>
  <Code2 size={15} />
</button>

// Mobile command sheet (Framer Motion AnimatePresence, same pattern as MobileSheet):
// A slide-up panel showing the full command in a <pre> block + Copy button
```

Add `Code2` to lucide-react imports.

---

## 5.4 Responsive Preview

`PreviewPanel.jsx` already uses `flex-1` and `object-contain`. On mobile, ensure the image doesn't overflow:

In `App.jsx` main area:
```jsx
<main className="flex-1 flex flex-col overflow-hidden p-2 md:p-3 min-h-0">
  <PreviewPanel />
</main>
```

The `min-h-0` is essential to prevent flex children from overflowing their container on mobile.

---

## 5.5 Error Display Polish

The error panel in `Sidebar.jsx` shows raw stderr. Add a dismiss button:

```jsx
{errorDetail && (
  <div className="p-3 border-t border-red-900/50 bg-red-950/30 text-xs text-red-300 max-h-32 overflow-y-auto font-mono relative">
    <button
      onClick={() => useImageStore.getState().setError(null)}
      className="absolute top-2 right-2 text-red-400 hover:text-red-200"
    >
      <X size={12} />
    </button>
    <p className="font-sans font-medium mb-1 text-red-400">{errorDetail.message}</p>
    {errorDetail.stderr && <pre className="whitespace-pre-wrap">{errorDetail.stderr}</pre>}
  </div>
)}
```

Also update the store's `setError` to accept `null` for dismissal:
```js
setError(errorDetail) {
  set({ errorDetail, isProcessing: false, abortController: null })
},
```

---

## 5.6 Aspect Ratio Lock (TransformTab enhancement)

When "Lock aspect ratio" is enabled in TransformTab, the client needs the original image's natural dimensions to compute the locked height when width changes.

Add to store:
```js
originalDimensions: null,   // { width, height } — set when originalBlobUrl is created
```

In `setFile`:
```js
const img = new Image()
img.onload = () => {
  useImageStore.setState({ originalDimensions: { width: img.naturalWidth, height: img.naturalHeight } })
}
img.src = URL.createObjectURL(file)
```

In `TransformTab`, when width input changes with lock enabled:
```js
const ratio = originalDimensions.height / originalDimensions.width
const newH  = Math.round(newW * ratio)
updateOp('resize', { ...ops.resize, width: newW, height: newH })
```

---

## 5.7 Final `App.jsx`

```jsx
import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { Moon, Sun } from 'lucide-react'
import { Sidebar } from './components/Sidebar.jsx'
import { PreviewPanel } from './components/PreviewPanel.jsx'
import { CommandBar } from './components/CommandBar.jsx'
import { MobileSheet } from './components/MobileSheet.jsx'
import { useImageStore } from './store/imageStore.js'
import { fetchCapabilities } from './api/client.js'

export default function App() {
  const setCapabilities = useImageStore(s => s.setCapabilities)
  const [dark, setDark] = useState(true)

  useEffect(() => {
    fetchCapabilities().then(setCapabilities)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
  }, [dark])

  return (
    <div className="h-svh flex flex-col bg-gray-950 text-white overflow-hidden">
      <header className="flex items-center px-4 h-12 border-b border-white/10 flex-shrink-0">
        <span className="font-bold tracking-tight text-sm">MagickStudio</span>
        <button
          onClick={() => setDark(d => !d)}
          className="ml-auto p-2 rounded hover:bg-white/10 text-gray-400"
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Desktop sidebar */}
        <div className="hidden md:flex flex-shrink-0">
          <Sidebar />
        </div>

        {/* Preview */}
        <main className="flex-1 flex flex-col overflow-hidden p-2 md:p-3 min-h-0">
          <PreviewPanel />
        </main>
      </div>

      <CommandBar />
      <MobileSheet />
      <Toaster theme="dark" position="bottom-center" offset={56} />
    </div>
  )
}
```

Note: `h-svh` (small viewport height) to avoid mobile browser chrome overlap. Falls back to `h-screen` if not supported.

---

## 5.8 Performance: blob URL cleanup

Ensure blob URLs are revoked when no longer needed. The store's `setFile` and `setProcessed` already revoke previous URLs. Add cleanup on component unmount:

```js
// in imageStore.js — add a cleanup action
cleanup() {
  const { originalBlobUrl, processedBlobUrl } = get()
  if (originalBlobUrl) URL.revokeObjectURL(originalBlobUrl)
  if (processedBlobUrl) URL.revokeObjectURL(processedBlobUrl)
  set({ originalBlobUrl: null, processedBlobUrl: null })
},
```

Call `useImageStore.getState().cleanup()` in a `window.beforeunload` listener in `App.jsx`.

---

## Full Verification Test Matrix

### Functional

| # | Test | Expected |
|---|---|---|
| F1 | `podman compose up --build` | Site loads at http://localhost:3000 |
| F2 | Upload JPEG | Thumbnail appears; original preview shows |
| F3 | Upload HEIC | Accepted if libheif present; greyed upload if not |
| F4 | Upload 51 MB file | Rejected with error toast "File too large" |
| F5 | Resize 800×600 Fit → Apply | Preview updates; dimensions shown as ≤ 800×600 |
| F6 | Crop (draw region) → Apply | Cropped area matches drawn region |
| F7 | Rotate +90 → Apply | Image rotated 90° CW |
| F8 | Flip + Flop → Apply | Both applied |
| F9 | Brightness −50 + Contrast +20 → Apply | Visibly darker, more contrasty |
| F10 | Grayscale → Apply | Greyscale output |
| F11 | Sepia Tone 80% → Apply | Sepia tint visible |
| F12 | Gaussian Blur sigma 5 → Apply | Visible blur |
| F13 | Unsharp Mask → Apply | Visible sharpening |
| F14 | Swirl 90° → Apply | Swirl effect visible |
| F15 | Vignette → Apply | Dark edges visible |
| F16 | Annotate "Hello" SouthEast → Apply | "Hello" text at bottom-right |
| F17 | Export as PNG → Download | Browser saves `output.png`; `file output.png` confirms PNG |
| F18 | Export as WebP quality 70 → Download | File is WebP, smaller than original |
| F19 | Stack resize + sepia + blur → Apply | All three applied in one pass |
| F20 | Apply → Cancel during processing | Spinner stops; no output; no error toast |
| F21 | Reset all settings | Ops clear; command bar shows just `magick input.jpg output.jpeg` |
| F22 | Replace image | New file loaded; processed state cleared |

### Security

| # | Test | Expected |
|---|---|---|
| S1 | POST `ops={"type":"$(id)"}` | 400 response; no process execution |
| S2 | POST `ops={"resize":{"width":"800; echo pwned"}}` | 400 response (isFinite fails) |
| S3 | POST `ops={"annotate":{"text":"ok\n$(rm -rf /tmp)"}}` | 400 (printable ASCII regex rejects newline) |
| S4 | POST valid ops but oversized file (51 MB) | 413 response |
| S5 | Upload file with `image/jpeg` MIME but PNG magic bytes | 415 response |
| S6 | Inside container: `magick 'http://evil.com/x.jpg' /tmp/out.jpg` | Fails: HTTP coder denied by policy.xml |
| S7 | `podman compose exec web id` | Shows `appuser` (non-root) |
| S8 | `podman compose exec web cat /proc/self/status \| grep Cap` | CapBnd/CapEff show all-zeros (no capabilities) — note: on macOS Podman runs in a Linux VM so `/proc` is accessible inside the container |

### Mobile / Responsive

| # | Test | Expected |
|---|---|---|
| M1 | Viewport 375px width | Sidebar hidden; preview fills width |
| M2 | Tap FAB (edit icon) | Bottom sheet slides up with Sidebar |
| M3 | Drag sheet down | Sheet dismisses |
| M4 | Apply from mobile sheet | Processing works; sheet stays open |
| M5 | CommandBar on mobile | Shows only Apply button + expand icon |
| M6 | Tap expand icon on CommandBar | Full command shows in sheet |

---

## Production Build Verification (Podman)

```bash
# Clean build
podman compose down --volumes
podman compose up --build --force-recreate

# Verify static serving
curl -s http://localhost:3000 | grep MagickStudio   # finds the title

# Verify API
curl -s http://localhost:3000/api/capabilities | python3 -m json.tool

# Full round-trip (needs a test image)
curl -s \
  -F "file=@/path/to/test.jpg" \
  -F 'ops={"resize":{"width":400,"height":300,"mode":"fit"},"brightnessContrast":{"b":10,"c":5}}' \
  -F "outputFormat=png" \
  -F "quality=90" \
  http://localhost:3000/api/process -o result.png
file result.png   # PNG image data

# Confirm ImageMagick HEIC support (may vary by Alpine version)
podman compose exec web magick -list format | grep -i heic

# Confirm policy.xml applied
podman compose exec web cat /etc/ImageMagick-7/policy.xml | grep HTTP

# Alternative exec syntax if podman-compose exec is unavailable:
# podman ps --format '{{.Names}}'            # list container names
# podman exec -it <container-name> magick --version
```

---

## Development Workflow (for future work)

```bash
# Terminal 1 — backend with hot reload
cd server && npm run dev        # :3001

# Terminal 2 — frontend with HMR
cd client && npm run dev        # :5173 (proxies /api → :3001)
```

The Vite proxy in `vite.config.js` ensures all `/api` calls in the browser go to the backend.
