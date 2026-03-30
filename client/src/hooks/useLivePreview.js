import { useEffect, useRef } from 'react'
import { useImageStore } from '../store/imageStore.js'
import { processImage } from '../api/client.js'

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
  const setLivePreview     = useImageStore(s => s.setLivePreview)

  const timerRef = useRef(null)

  useEffect(() => {
    if (!originalFile || isProcessing || !livePreviewEnabled) {
      clearTimeout(timerRef.current)
      return
    }

    clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      try {
        const file = previewFile ?? originalFile
        const { blobUrl } = await processImage({ file, ops, output: PREVIEW_OUTPUT })
        setLivePreview(blobUrl)
      } catch {
        // Silently ignore errors — live preview is best-effort
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timerRef.current)
  }, [originalFile, previewFile, ops, isProcessing, livePreviewEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])
}
