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

  const timerRef  = useRef(null)
  const abortRef  = useRef(null)

  useEffect(() => {
    // Nothing to do without a file, while Apply is running, or if disabled
    if (!originalFile || isProcessing || !livePreviewEnabled) {
      clearTimeout(timerRef.current)
      abortRef.current?.abort()
      return
    }

    // Debounce: clear any pending timer
    clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      // Cancel any previous live-preview request
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac

      try {
        const { blobUrl } = await processImage({
          file: originalFile,
          ops,
          output,
          signal: ac.signal,
        })
        setLivePreview(blobUrl)
      } catch {
        // Silently ignore aborts and errors — live preview is best-effort
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timerRef.current)
  }, [originalFile, ops, output, isProcessing, livePreviewEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cancel in-flight request when the component unmounts
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
      abortRef.current?.abort()
    }
  }, [])
}
