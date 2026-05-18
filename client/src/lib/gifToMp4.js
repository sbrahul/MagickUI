import { MagickFormat } from '@imagemagick/magick-wasm'
import { Output, Mp4OutputFormat, BufferTarget, CanvasSource, QUALITY_HIGH } from 'mediabunny'
import { getIM } from './wasm.js'
import { buildOps } from './buildOps.js'

/**
 * Converts an animated GIF to an MP4 (H.264) Blob using Mediabunny + WebCodecs.
 * Applies the same IM ops to each frame before encoding.
 *
 * @param {{ file: File, ops: object, output: object }} param0
 * @returns {Promise<{ blobUrl: string, meta: { format: string, sizeBytes: number } }>}
 */
export async function gifToMp4({ file, ops, output }) {
  if (!('VideoEncoder' in window)) {
    throw {
      message:
        'Your browser does not support the WebCodecs API (VideoEncoder). ' +
        'Please use Chrome 94+, Edge 94+, Firefox 130+, or Safari 16.4+.',
      stderr: '',
    }
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const IM = await getIM()

  // ── Step 1: extract all frame PNG bytes inside the synchronous IM callback ──
  const { frameDataArray, width, height } = await new Promise((resolve, reject) => {
    try {
      IM.readCollection(bytes, frames => {
        try {
          frames.coalesce()

          const frameDataArray = []
          let width = 0
          let height = 0

          for (let i = 0; i < frames.length; i++) {
            const frame = frames[i]
            // animationDelay is in centiseconds (1/100 s); convert to seconds.
            // A value of 0 is treated as 10 cs (100 ms) per the GIF spec.
            const delayS = (frame.animationDelay || 10) / 100

            buildOps(frame, ops, output)

            if (i === 0) {
              // H.264 requires dimensions divisible by 2.
              width  = Math.floor(frame.width  / 2) * 2
              height = Math.floor(frame.height / 2) * 2
            }

            // Write each frame as PNG bytes (synchronous callback).
            frame.write(MagickFormat.Png, data => {
              frameDataArray.push({ pngBytes: new Uint8Array(data), delayS })
            })
          }

          resolve({ frameDataArray, width, height })
        } catch (err) {
          reject({ message: err?.message ?? String(err), stderr: '' })
        }
      })
    } catch (err) {
      reject({ message: err?.message ?? String(err), stderr: '' })
    }
  })

  if (frameDataArray.length === 0) {
    throw { message: 'No frames found in GIF.', stderr: '' }
  }

  // ── Step 2: mux frames into MP4 with Mediabunny ──
  const mp4Output = new Output({
    format: new Mp4OutputFormat(),
    target: new BufferTarget(),
  })

  // CanvasSource handles VideoEncoder internally — no manual WebCodecs management needed.
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  const videoSource = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: QUALITY_HIGH,
  })

  mp4Output.addVideoTrack(videoSource)
  await mp4Output.start()

  const loops = Math.max(1, Math.round(output.videoLoops ?? 1))
  let timestampS = 0
  for (let loop = 0; loop < loops; loop++) {
    for (const { pngBytes, delayS } of frameDataArray) {
      const bitmap = await createImageBitmap(new Blob([pngBytes], { type: 'image/png' }))
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(bitmap, 0, 0, width, height)
      bitmap.close()

      await videoSource.add(timestampS, delayS)
      timestampS += delayS
    }
  }

  videoSource.close()
  await mp4Output.finalize()

  const mp4Blob = new Blob([mp4Output.target.buffer], { type: 'video/mp4' })
  return {
    blobUrl: URL.createObjectURL(mp4Blob),
    meta: { format: 'mp4', sizeBytes: mp4Blob.size },
  }
}
