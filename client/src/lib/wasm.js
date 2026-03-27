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
