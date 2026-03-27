import { getIM }    from '../lib/wasm.js'
import { buildOps, getMime } from '../lib/buildOps.js'
import { MagickFormat } from '@imagemagick/magick-wasm'

const FORMAT_ENUM = {
  jpeg: MagickFormat.Jpeg,
  png:  MagickFormat.Png,
  webp: MagickFormat.WebP,
  avif: MagickFormat.Avif,
  tiff: MagickFormat.Tiff,
  gif:  MagickFormat.Gif,
}

export async function processImage({ file, ops, output }) {
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  const IM = await getIM()

  return new Promise((resolve, reject) => {
    try {
      IM.read(bytes, image => {
        try {
          buildOps(image, ops, output)
          image.write(FORMAT_ENUM[output.format] ?? MagickFormat.Jpeg, data => {
            const mime = getMime(output.format)
            const blob = new Blob([data], { type: mime })
            resolve({
              blobUrl: URL.createObjectURL(blob),
              meta: { format: output.format, sizeBytes: blob.size },
            })
          })
        } catch (err) {
          reject({ message: err?.message ?? String(err), stderr: '' })
        }
      })
    } catch (err) {
      reject({ message: err?.message ?? String(err), stderr: '' })
    }
  })
}

export function fetchCapabilities() {
  return Promise.resolve({
    inputFormats:  [],
    outputFormats: ['jpeg', 'png', 'webp', 'avif', 'tiff', 'gif'],
  })
}
