import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { useImageStore } from '../store/imageStore.js'
import { decodeForDisplay } from '../api/client.js'
import { makePreviewFile } from '../lib/previewScale.js'
import { isAnimatedGif } from '../lib/wasm.js'
import { buildAcceptMap, INPUT_LABEL } from '../lib/formats.js'
import { Upload } from 'lucide-react'
import { cn } from '../lib/utils.js'

const ACCEPTED = buildAcceptMap()
const MAX_SIZE = 50 * 1024 * 1024

// Wasm runs on the main thread, so let the "Decoding…" spinner paint before it blocks.
const nextPaint = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

export function UploadZone() {
  const setFile          = useImageStore(s => s.setFile)
  const setDisplayUrl    = useImageStore(s => s.setDisplayUrl)
  const setPreviewFile   = useImageStore(s => s.setPreviewFile)
  const setIsAnimatedGif = useImageStore(s => s.setIsAnimatedGif)
  const setDecoding      = useImageStore(s => s.setDecoding)
  const originalFile     = useImageStore(s => s.originalFile)
  const originalBlobUrl  = useImageStore(s => s.originalBlobUrl)

  async function handleDrop([file]) {
    setFile(file)
    // Detect animated GIF asynchronously; update store when known.
    isAnimatedGif(file).then(setIsAnimatedGif)
    const isCurrent = () => useImageStore.getState().originalFile === file

    // The browser decodes most formats itself; makePreviewFile returns null when it cannot.
    const pf = await makePreviewFile(file)
    if (pf) {
      if (isCurrent()) setPreviewFile(pf)
      return
    }

    // originalFile stays as uploaded; the converted copy is for display and live preview only.
    setDecoding(true)
    try {
      await nextPaint()
      const { blobUrl, width, height } = await decodeForDisplay(file)
      if (!isCurrent()) { URL.revokeObjectURL(blobUrl); return }
      setDisplayUrl(blobUrl, { width, height })
      const converted = await fetch(blobUrl).then(r => r.blob())
      const convertedPreview = await makePreviewFile(converted)
      if (convertedPreview && isCurrent()) setPreviewFile(convertedPreview)
    } catch (err) {
      if (isCurrent()) toast.error(`Could not open ${file.name}: ${err?.message ?? err}`)
    } finally {
      if (isCurrent()) setDecoding(false)
    }
  }

  function handleReject([rejection]) {
    const { file, errors } = rejection
    const reason = errors[0]?.code === 'file-too-large'
      ? `is larger than ${MAX_SIZE / 1024 / 1024} MB`
      : 'is not a supported image format'
    toast.error(`${file.name} ${reason}`)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    multiple: false,
    onDropAccepted: handleDrop,
    onDropRejected: handleReject,
  })

  if (originalFile) {
    return (
      <div className="flex items-center gap-3 p-3 border border-white/10 rounded-lg bg-white/5">
        <img src={originalBlobUrl} alt="original" className="h-14 w-14 rounded object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{originalFile.name}</p>
          <p className="text-xs text-gray-400">{(originalFile.size / 1024).toFixed(0)} KB</p>
        </div>
        <button
          onClick={() => setFile(null)}
          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded flex-shrink-0"
        >
          Replace
        </button>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors',
        isDragActive
          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
          : 'border-white/20 hover:border-white/40 text-gray-400'
      )}
    >
      <input {...getInputProps()} />
      <Upload size={28} />
      <p className="text-sm text-center">
        Drop an image here, or <span className="underline">browse</span>
      </p>
      <p className="text-xs text-center">{INPUT_LABEL} — max 50 MB</p>
    </div>
  )
}
