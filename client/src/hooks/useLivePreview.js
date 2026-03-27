import { useEffect, useRef } from 'react'
import { useImageStore } from '../store/imageStore.js'
import { processImage } from '../api/client.js'

const DEBOUNCE_MS = 600

export function useLivePreview() {
  const originalFile       = useImageStore(s => s.originalFile)
  const ops                = useImageStore(s => s.ops)
  const output             = useImageStore(s => s.output)
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
        const { blobUrl } = await processImage({ file: originalFile, ops, output })
        setLivePreview(blobUrl)
      } catch {
        // Silently ignore errors — live preview is best-effort
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timerRef.current)
  }, [originalFile, ops, output, isProcessing, livePreviewEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])
}
