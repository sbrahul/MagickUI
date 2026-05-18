import { initializeImageMagick, ImageMagick } from '@imagemagick/magick-wasm'
import wasmUrl from '@imagemagick/magick-wasm/magick.wasm?url'

let initializing = null

export async function getIM() {
  if (!initializing) {
    initializing = fetch(wasmUrl)
      .then(r => r.arrayBuffer())
      .then(buf => initializeImageMagick(new Uint8Array(buf)))
      .then(() => ImageMagick)
  }
  await initializing
  return ImageMagick
}

/**
 * Returns true if the file is an animated GIF (more than one frame).
 * Always resolves — never rejects.
 */
export async function isAnimatedGif(file) {
  if (!file) return false
  const isGif = file.type === 'image/gif' || /\.gif$/i.test(file.name)
  if (!isGif) return false
  const bytes = new Uint8Array(await file.arrayBuffer())
  const IM = await getIM()
  return new Promise(resolve => {
    try {
      IM.readCollection(bytes, frames => resolve(frames.length > 1))
    } catch {
      resolve(false)
    }
  })
}
