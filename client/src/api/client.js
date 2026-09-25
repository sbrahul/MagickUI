import { getIM, loadFont, readLogo, withImage } from '../lib/wasm.js'
import { buildOps } from '../lib/buildOps.js'
import { getMime, isDisplayable, readHint, readsLargestFrame } from '../lib/formats.js'
import { gifToMp4 } from '../lib/gifToMp4.js'
import { CompressionMethod, MagickFormat } from '@imagemagick/magick-wasm'

const FORMAT_ENUM = {
  jpeg: MagickFormat.Jpeg,
  png:  MagickFormat.Png,
  webp: MagickFormat.WebP,
  avif: MagickFormat.Avif,
  tiff: MagickFormat.Tiff,
  gif:  MagickFormat.Gif,
  jxl:  MagickFormat.Jxl,
  bmp:  MagickFormat.Bmp,
  ico:  MagickFormat.Ico,
  pdf:  MagickFormat.Pdf,
}

export async function processImage({ file, ops, output }) {
  if (output.format === 'mp4') {
    return gifToMp4({ file, ops, output })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const logoBytes = await readLogo(ops)
  const IM = await getIM()
  if (ops.annotate?.text) await loadFont()

  try {
    if (output.format === 'gif' && isGif(file)) {
      return withImage(IM, logoBytes, watermark => processGifFrames(IM, bytes, ops, output, watermark))
    }
    return withImage(IM, logoBytes, watermark => readImage(IM, bytes, file.name, image => {
      buildOps(image, ops, output, { watermark })
      const blob = output.format === 'pdf' ? writePdf(IM, image, output) : writeBlob(image, output.format)
      return {
        blobUrl: URL.createObjectURL(blob),
        previewUrl: isDisplayable(output.format) ? null : URL.createObjectURL(writePreview(image)),
        meta: { format: output.format, sizeBytes: blob.size },
      }
    }))
  } catch (err) {
    throw toError(err)
  }
}

export async function decodeForDisplay(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const IM = await getIM()
  try {
    return readImage(IM, bytes, file.name, image => ({
      width: image.width,
      height: image.height,
      blobUrl: URL.createObjectURL(writePreview(image)),
    }))
  } catch (err) {
    throw toError(err)
  }
}

function isGif(file) {
  return file.type === 'image/gif' || /\.gif$/i.test(file.name ?? '')
}

// IM.read keeps only the first frame, so an animated GIF needs the collection API.
function processGifFrames(IM, bytes, ops, output, watermark) {
  return IM.readCollection(bytes, frames => {
    frames.coalesce()
    const ctx = { animation: {}, watermark }
    for (const frame of frames) buildOps(frame, ops, output, ctx)
    let blob
    frames.write(MagickFormat.Gif, data => { blob = new Blob([data], { type: getMime('gif') }) })
    return {
      blobUrl: URL.createObjectURL(blob),
      previewUrl: null,
      meta: { format: 'gif', sizeBytes: blob.size },
    }
  })
}

function readImage(IM, bytes, name, fn) {
  const hint = readHint(name)
  if (readsLargestFrame(name)) {
    // Icons hold several sizes and the first entry is often 16 px.
    return IM.readCollection(bytes, hint, frames =>
      fn(frames.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a))))
  }
  return hint ? IM.read(bytes, hint, fn) : IM.read(bytes, fn)
}

function toError(err) {
  const message = err?.message ?? String(err)
  if (err instanceof RangeError || /memory access out of bounds|out of memory/i.test(message)) {
    return { message: 'The image is too large to process in the browser.', stderr: message }
  }
  return { message, stderr: '' }
}

function writeBlob(image, format) {
  let blob
  image.write(FORMAT_ENUM[format] ?? MagickFormat.Jpeg, data => {
    blob = new Blob([data], { type: getMime(format) })
  })
  return blob
}

// setCompression(Jpeg) is ignored by the PDF coder, but a JPEG-decoded image keeps DCT.
function writePdf(IM, image, output) {
  if ((output.quality ?? 85) >= 100) {
    image.setCompression(CompressionMethod.Zip)
    return writeBlob(image, 'pdf')
  }
  let jpeg
  image.write(MagickFormat.Jpeg, data => { jpeg = data.slice() })
  return IM.read(jpeg, j => writeBlob(j, 'pdf'))
}

function writePreview(image) {
  if (image.hasAlpha) return writeBlob(image, 'png')
  image.quality = 90
  return writeBlob(image, 'jpeg')
}
