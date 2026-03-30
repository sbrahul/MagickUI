import { useDropzone } from 'react-dropzone'
import { useImageStore } from '../store/imageStore.js'
import { processImage } from '../api/client.js'
import { makePreviewFile } from '../lib/previewScale.js'
import { Upload } from 'lucide-react'
import { cn } from '../lib/utils.js'

const ACCEPTED = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png':  ['.png'],
  'image/webp': ['.webp'],
  'image/gif':  ['.gif'],
  'image/tiff': ['.tiff', '.tif'],
  'image/bmp':  ['.bmp'],
  'image/heic': ['.heic', '.heif'],
  'image/heif': ['.heif'],
  'image/avif': ['.avif'],
}

export function UploadZone() {
  const setFile         = useImageStore(s => s.setFile)
  const setDisplayUrl   = useImageStore(s => s.setDisplayUrl)
  const setPreviewFile  = useImageStore(s => s.setPreviewFile)
  const originalFile    = useImageStore(s => s.originalFile)
  const originalBlobUrl = useImageStore(s => s.originalBlobUrl)

  async function handleDrop([file]) {
    setFile(file)
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
      || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name)

    if (isHeic) {
      try {
        // Browser cannot render HEIC natively; convert to JPEG via WASM for display only.
        // originalFile is kept as-is so processing still operates on the original.
        const { blobUrl } = await processImage({
          file,
          ops: {},
          output: { format: 'jpeg', quality: 85, strip: false, interlace: false, losslessWebp: false },
        })
        setDisplayUrl(blobUrl)
        // Scale down the WASM-decoded JPEG for live preview
        const jpeg = await fetch(blobUrl).then(r => r.blob())
        const pf = await makePreviewFile(jpeg)
        if (pf) setPreviewFile(pf)
      } catch {
        // Leave the broken img — better than crashing
      }
    } else {
      // Scale down directly from the uploaded file
      const pf = await makePreviewFile(file)
      if (pf) setPreviewFile(pf)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED,
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    onDropAccepted: handleDrop,
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
      <p className="text-xs text-center">JPEG · PNG · WebP · HEIC · AVIF · GIF · TIFF — max 50 MB</p>
    </div>
  )
}
