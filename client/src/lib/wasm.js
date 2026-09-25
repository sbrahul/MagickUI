import { initializeImageMagick, ImageMagick, Magick } from '@imagemagick/magick-wasm'
import wasmUrl from '@imagemagick/magick-wasm/magick.wasm?url'
import fontUrl from '../assets/fonts/NotoSans-Regular.ttf?url'
import { FONT_NAME } from './buildOps.js'

let initializing = null
let fontLoading = null

async function fetchBytes(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Failed to load ${url}: HTTP ${r.status}`)
  return new Uint8Array(await r.arrayBuffer())
}

export async function getIM() {
  if (!initializing) {
    initializing = fetchBytes(wasmUrl)
      .then(bytes => initializeImageMagick(bytes))
      .then(() => ImageMagick)
      .catch(err => { initializing = null; throw err })
  }
  await initializing
  return ImageMagick
}

// The wasm build has no fonts, so annotate fails with UnableToReadFont until one is added.
export async function loadFont() {
  if (!fontLoading) {
    fontLoading = Promise.all([getIM(), fetchBytes(fontUrl)])
      .then(([, bytes]) => Magick.addFont(FONT_NAME, bytes))
      .catch(err => { fontLoading = null; throw err })
  }
  await fontLoading
}

/**
 * Returns true if the file is an animated GIF (more than one frame).
 * Always resolves — never rejects.
 */
export async function isAnimatedGif(file) {
  if (!file) return false
  const isGif = file.type === 'image/gif' || /\.gif$/i.test(file.name)
  if (!isGif) return false
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const IM = await getIM()
    return IM.readCollection(bytes, frames => frames.length > 1)
  } catch {
    return false
  }
}
