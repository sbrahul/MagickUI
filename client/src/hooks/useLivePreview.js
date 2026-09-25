import { useEffect, useRef } from 'react'
import { useImageStore } from '../store/imageStore.js'
import { processImage } from '../api/client.js'
import { dropsAlpha } from '../lib/formats.js'
import { needsAlpha } from '../lib/buildOps.js'

const DEBOUNCE_MS = 600

// Fixed output settings for live preview: always JPEG, lower quality.
// Format conversion is meaningless at preview resolution and adds latency.
const PREVIEW_OUTPUT = { format: 'jpeg', quality: 70, strip: false, interlace: false, losslessWebp: false }

export function useLivePreview() {
  const originalFile       = useImageStore(s => s.originalFile)
  const previewFile        = useImageStore(s => s.previewFile)
  const ops                = useImageStore(s => s.ops)
  const isProcessing       = useImageStore(s => s.isProcessing)
  const livePreviewEnabled = useImageStore(s => s.livePreviewEnabled)
  const isDecoding         = useImageStore(s => s.isDecoding)
  const outputFormat       = useImageStore(s => s.output.format)
  const outputQuality      = useImageStore(s => s.output.quality)
  const flattenBg          = useImageStore(s => s.output.flattenBg)
  const setLivePreview     = useImageStore(s => s.setLivePreview)

  const timerRef = useRef(null)

  useEffect(() => {
    if (!originalFile || isProcessing || !livePreviewEnabled || isDecoding) {
      clearTimeout(timerRef.current)
      return
    }

    clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      try {
        const file = previewFile ?? originalFile
        // A WebP preview source means the image may have transparency; JPEG would hide it.
        const mayHaveAlpha = file.type === 'image/webp' || needsAlpha(ops)
        const keepAlpha = mayHaveAlpha && !dropsAlpha({ format: outputFormat, quality: outputQuality })
        const output = keepAlpha ? { ...PREVIEW_OUTPUT, format: 'webp' } : { ...PREVIEW_OUTPUT, flattenBg }
        const { blobUrl } = await processImage({ file, ops, output })
        setLivePreview(blobUrl)
      } catch {
        // Silently ignore errors — live preview is best-effort
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timerRef.current)
  }, [originalFile, previewFile, ops, isProcessing, livePreviewEnabled, isDecoding, outputFormat, outputQuality, flattenBg]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])
}
