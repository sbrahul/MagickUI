# MagickStudio

A browser-based image processing tool powered by [ImageMagick](https://imagemagick.org). Upload an image, apply transforms, color corrections, effects, and annotations, then download the result — all without leaving the browser.

## Features

- **Transform** — resize (fit / fill / exact / percent), crop, rotate, flip/flop, trim, auto-orient (EXIF)
- **Color** — brightness/contrast, hue/saturation/brightness modulate, gamma, levels, grayscale, negate, normalize, equalize, white balance, sepia tone, colorspace
- **Blur / Sharpen** — Gaussian blur, sharpen, unsharp mask, median filter, despeckle, wavelet denoise
- **Effects** — charcoal, emboss, edge detect, sketch, spread, swirl, wave, implode, posterize, solarize, oil paint, vignette
- **Annotate** — text overlay with gravity picker, font size, color, opacity, rotation, border
- **Output** — JPEG / PNG / WebP / AVIF / TIFF / GIF / BMP / HEIC; quality, progressive JPEG, lossless WebP, metadata strip, download
- **Live command preview** — see the exact `magick` command that will run before you apply it
- **Mobile-first** — responsive layout with a slide-up bottom sheet on small screens
- **Dark / light theme** toggle

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, Zustand 5, Radix UI, Framer Motion |
| Backend | Node.js, Express 5, Multer |
| Processing | ImageMagick 7 |
| Container | Podman / Docker (Alpine Linux, non-root) |

## Quick start (Podman or Docker)

```bash
git clone <repo>
cd imagemagick-web

# Podman
podman compose up --build

# Docker
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

The `MAX_FILE_SIZE_MB` environment variable (default `50`) controls the upload limit.

## Development

### Prerequisites

- Node.js 20+
- ImageMagick 7 (`magick` binary on `$PATH`)

### Server

```bash
cd server
npm install
node --watch index.js   # listens on :3001
```

### Client

```bash
cd client
npm install
npm run dev             # Vite dev server on :5173, proxies /api → :3001
```

## Security

- Magic-byte validation — MIME type from file content, not the filename
- Prototype-pollution key rejection (`__proto__`, `constructor`, `prototype`)
- Strict input validation with numeric clamping and enum whitelists
- `policy.xml` disables ImageMagick's HTTP/HTTPS coders
- Container runs as a non-root user (`appuser`) with all Linux capabilities dropped and `no-new-privileges`
- HTTP security headers via [Helmet](https://helmetjs.github.io/)
- 50 MB upload limit enforced by Multer before any processing

## Running tests

```bash
# Requires the container (or dev server) to be running on :3000
bash tests/api.sh

# Custom base URL or image
bash tests/api.sh http://localhost:3001 tests/fixtures/test.png
```

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).
