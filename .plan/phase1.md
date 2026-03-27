# Phase 1 — Project Scaffold & Docker

**Goal:** Empty repo → buildable skeleton that compiles and runs on port 3000.
**Deliverable check:** `podman compose up --build` → `curl http://localhost:3000` returns an HTML page.

> **Podman note:** `podman compose` requires `podman-compose` to be installed (`pip install podman-compose`) or Podman v4.7+ with the built-in compose plugin. The `Dockerfile` and `docker-compose.yml` filenames are supported by Podman unchanged.

---

## File tree to produce

```
imagemagick-web/
├── .dockerignore
├── docker-compose.yml
├── Dockerfile
├── policy.xml                   ← ImageMagick hardening
├── server/
│   ├── package.json
│   └── index.js                 ← skeleton (501 stubs for /api routes)
└── client/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── index.css
        ├── App.jsx              ← placeholder heading only
        └── lib/
            └── utils.js         ← cn() helper
```

---

## 1.1 `server/package.json`

```json
{
  "name": "magickstudio-server",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev":   "node --watch index.js"
  },
  "dependencies": {
    "cors":    "^2.8.5",
    "express": "^4.21.2",
    "helmet":  "^8.0.0",
    "multer":  "^1.4.5-lts.1"
  }
}
```

---

## 1.2 `client/package.json`

```json
{
  "name": "magickstudio-client",
  "type": "module",
  "scripts": {
    "dev":     "vite",
    "build":   "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "clsx":            "^2.1.1",
    "framer-motion":   "^12.5.0",
    "lucide-react":    "^0.479.0",
    "react":           "^19.0.0",
    "react-colorful":  "^5.6.1",
    "react-dom":       "^19.0.0",
    "react-dropzone":  "^14.3.8",
    "react-image-crop":"^11.0.7",
    "sonner":          "^2.0.1",
    "tailwind-merge":  "^3.1.0",
    "zustand":         "^5.0.3"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.14",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.0.14",
    "vite": "^6.2.2"
  }
}
```

Note: shadcn/ui components are copied in manually (Tabs, Slider, Switch, Button, Sheet) — the CLI requires interactive prompts, so we hand-write the specific Radix-based components needed.

---

## 1.3 `client/vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': 'http://localhost:3001' },
  },
})
```

---

## 1.4 `client/index.html`

Standard Vite shell — `<div id="root">` + `<script type="module" src="/src/main.jsx">`.

---

## 1.5 `client/src/main.jsx`

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
```

---

## 1.6 `client/src/index.css`

Tailwind v4 CSS entry (no config file needed — Tailwind v4 uses CSS-first config):

```css
@import "tailwindcss";

:root {
  color-scheme: light dark;
}
```

---

## 1.7 `client/src/App.jsx` (placeholder)

A simple heading. Replaced wholesale in Phase 3.

```jsx
export default function App() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
      <h1 className="text-3xl font-bold">MagickStudio</h1>
    </div>
  )
}
```

---

## 1.8 `client/src/lib/utils.js`

```js
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
```

---

## 1.9 `server/index.js` (skeleton)

```js
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT ?? 3001

app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Stubs — implemented in Phase 2
app.get('/api/capabilities', (_req, res) => res.status(501).json({ error: 'Not implemented' }))
app.post('/api/process',     (_req, res) => res.status(501).json({ error: 'Not implemented' }))

// Static + SPA fallback (production only)
if (process.env.NODE_ENV === 'production') {
  const pub = join(__dirname, 'public')
  app.use(express.static(pub))
  app.get('*', (_req, res) => res.sendFile(join(pub, 'index.html')))
}

app.listen(PORT, () => console.log(`Server listening on :${PORT}`))
```

---

## 1.10 `policy.xml` (repo root)

Copied into the Docker image at `/etc/ImageMagick-7/policy.xml`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE policymap [
  <!ELEMENT policymap (policy)*>
  <!ELEMENT policy (#PCDATA)>
  <!ATTLIST policy domain  NMTOKEN #REQUIRED>
  <!ATTLIST policy name    NMTOKEN #IMPLIED>
  <!ATTLIST policy pattern CDATA   #IMPLIED>
  <!ATTLIST policy rights  NMTOKEN #IMPLIED>
  <!ATTLIST policy value   CDATA   #IMPLIED>
]>
<policymap>
  <!-- Deny dangerous URL/scripting coders (ImageTragick CVE-2016-3714) -->
  <policy domain="coder" rights="none" pattern="URL"       />
  <policy domain="coder" rights="none" pattern="HTTP"      />
  <policy domain="coder" rights="none" pattern="HTTPS"     />
  <policy domain="coder" rights="none" pattern="FTP"       />
  <policy domain="coder" rights="none" pattern="MVG"       />
  <policy domain="coder" rights="none" pattern="MSL"       />
  <policy domain="coder" rights="none" pattern="EPHEMERAL" />
  <!-- Deny @filename MSL includes -->
  <policy domain="path"     rights="none" pattern="@*"     />
  <!-- Resource limits -->
  <policy domain="resource" name="time"   value="120"      />
  <policy domain="resource" name="memory" value="512MiB"   />
  <policy domain="resource" name="disk"   value="1GiB"     />
  <policy domain="resource" name="width"  value="16KP"     />
  <policy domain="resource" name="height" value="16KP"     />
  <policy domain="resource" name="area"   value="128MP"    />
</policymap>
```

---

## 1.11 `Dockerfile`

```dockerfile
# ── Stage 1: build client ──────────────────────────────────────────
FROM node:22-alpine3.20 AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: production server ────────────────────────────────────
FROM node:22-alpine3.20 AS production

# imagemagick-heic includes libheif for HEIF/HEIC support
# Falls back gracefully if missing — /api/capabilities reports it
RUN apk add --no-cache imagemagick imagemagick-heic || apk add --no-cache imagemagick

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client-builder /app/client/dist ./public

# Harden ImageMagick
COPY policy.xml /etc/ImageMagick-7/policy.xml

# Run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
ENV PORT=3000 NODE_ENV=production
CMD ["node", "index.js"]
```

---

## 1.12 `docker-compose.yml`

```yaml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      PORT: "3000"
      NODE_ENV: production
      MAX_FILE_SIZE_MB: "50"
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    ulimits:
      nproc: 64
      nofile:
        soft: 1024
        hard: 1024
```

---

## 1.13 `.dockerignore`

```
**/node_modules
**/dist
.git
.gitignore
.plan
```

---

## Verification

```bash
# Install deps locally for IDE support
cd server && npm install && cd ..
cd client && npm install && cd ..

# Build + run with Podman
podman compose up --build

# In another terminal:
curl -s http://localhost:3000 | head -5          # returns HTML
podman compose exec web id                       # shows appuser (non-root)
podman compose exec web magick --version         # shows ImageMagick version

# Alternative exec syntax if podman-compose exec is unavailable:
# podman ps                                      # find container name/id
# podman exec -it <container-id> id
```
