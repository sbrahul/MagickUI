// Plain data so components and tests can use it without loading magick-wasm.

// Order is the picker order (4 per row): web formats, other rasters, special outputs.
// JXL is marked not displayable because only Safari can show it.
export const OUTPUT_FORMATS = [
  { value: 'jpeg', label: 'JPEG', ext: 'jpg',  mime: 'image/jpeg',      displayable: true,  usesQuality: true  },
  { value: 'png',  label: 'PNG',  ext: 'png',  mime: 'image/png',       displayable: true,  usesQuality: false },
  { value: 'webp', label: 'WebP', ext: 'webp', mime: 'image/webp',      displayable: true,  usesQuality: true  },
  { value: 'avif', label: 'AVIF', ext: 'avif', mime: 'image/avif',      displayable: true,  usesQuality: true  },
  { value: 'jxl',  label: 'JXL',  ext: 'jxl',  mime: 'image/jxl',       displayable: false, usesQuality: true  },
  { value: 'gif',  label: 'GIF',  ext: 'gif',  mime: 'image/gif',       displayable: true,  usesQuality: false },
  { value: 'tiff', label: 'TIFF', ext: 'tiff', mime: 'image/tiff',      displayable: false, usesQuality: false },
  { value: 'bmp',  label: 'BMP',  ext: 'bmp',  mime: 'image/bmp',       displayable: true,  usesQuality: false },
  { value: 'ico',  label: 'ICO',  ext: 'ico',  mime: 'image/x-icon',    displayable: true,  usesQuality: false },
  { value: 'pdf',  label: 'PDF',  ext: 'pdf',  mime: 'application/pdf', displayable: false, usesQuality: true  },
  { value: 'mp4',  label: 'MP4',  ext: 'mp4',  mime: 'video/mp4',       displayable: true,  usesQuality: false, animatedGifOnly: true },
]

const byValue = Object.fromEntries(OUTPUT_FORMATS.map(f => [f.value, f]))

export function getMime(format) {
  return byValue[format]?.mime ?? 'application/octet-stream'
}

export function extFor(format) {
  return byValue[format]?.ext ?? format
}

export function isDisplayable(format) {
  return byValue[format]?.displayable ?? false
}

export function usesQuality(format) {
  return byValue[format]?.usesQuality ?? false
}

// PDF below quality 100 is written through a JPEG round trip (see api/client.js).
export function dropsAlpha(output) {
  return output.format === 'jpeg' || output.format === 'mp4'
    || (output.format === 'pdf' && (output.quality ?? 85) < 100)
}

// react-dropzone accepts a file when its extension OR its mime type matches, and browsers
// report no or odd mime types for most of these, so the extensions do the matching.
export const INPUT_FORMATS = [
  { mime: 'image/jpeg',                exts: ['.jpg', '.jpeg'] },
  { mime: 'image/png',                 exts: ['.png'] },
  { mime: 'image/webp',                exts: ['.webp'] },
  { mime: 'image/gif',                 exts: ['.gif'] },
  { mime: 'image/tiff',                exts: ['.tiff', '.tif'] },
  { mime: 'image/bmp',                 exts: ['.bmp'] },
  { mime: 'image/heic',                exts: ['.heic'] },
  { mime: 'image/heif',                exts: ['.heif'] },
  { mime: 'image/avif',                exts: ['.avif'] },
  { mime: 'image/jxl',                 exts: ['.jxl'] },
  { mime: 'image/vnd.adobe.photoshop', exts: ['.psd', '.psb'] },
  { mime: 'image/x-icon',              exts: ['.ico', '.cur'], largestFrame: true },
  { mime: 'image/x-tga',               exts: ['.tga'] },
  { mime: 'image/qoi',                 exts: ['.qoi'] },
  { mime: 'image/x-exr',               exts: ['.exr'] },
  { mime: 'image/vnd.radiance',        exts: ['.hdr'] },
  { mime: 'image/x-pcx',               exts: ['.pcx'] },
  { mime: 'image/vnd.ms-dds',          exts: ['.dds'] },
  { mime: 'image/jp2',                 exts: ['.jp2', '.j2k'] },
]

// Formats ImageMagick cannot detect from the file's first bytes.
const READ_HINTS = { '.tga': 'TGA', '.ico': 'ICO', '.cur': 'CUR' }

function extOf(name = '') {
  const i = name.lastIndexOf('.')
  return i < 0 ? '' : name.slice(i).toLowerCase()
}

export function buildAcceptMap() {
  return Object.fromEntries(INPUT_FORMATS.map(f => [f.mime, f.exts]))
}

export function readHint(name) {
  return READ_HINTS[extOf(name)]
}

export function readsLargestFrame(name) {
  const ext = extOf(name)
  return INPUT_FORMATS.some(f => f.largestFrame && f.exts.includes(ext))
}

export const INPUT_LABEL = 'JPEG · PNG · WebP · HEIC · AVIF · GIF · TIFF · JXL · PSD · ICO · TGA · QOI · EXR · HDR · PCX · DDS · JP2'
