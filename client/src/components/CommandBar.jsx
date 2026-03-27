import { Copy, Play, X } from 'lucide-react'
import { toast } from 'sonner'
import { useImageStore } from '../store/imageStore.js'
import { buildCommand } from '../lib/buildCommand.js'
import { processImage } from '../api/client.js'

export function CommandBar() {
  const originalFile    = useImageStore(s => s.originalFile)
  const ops             = useImageStore(s => s.ops)
  const output          = useImageStore(s => s.output)
  const isProcessing    = useImageStore(s => s.isProcessing)
  const abortController = useImageStore(s => s.abortController)
  const setProcessing   = useImageStore(s => s.setProcessing)
  const setProcessed    = useImageStore(s => s.setProcessed)
  const setError        = useImageStore(s => s.setError)

  const ext = originalFile?.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const cmd = buildCommand(ops, output, ext)

  async function handleApply() {
    if (!originalFile || isProcessing) return
    const ac = new AbortController()
    setProcessing(true, ac)
    toast.loading('Processing…', { id: 'process' })
    try {
      const { blobUrl, meta } = await processImage({
        file: originalFile, ops, output, signal: ac.signal,
      })
      setProcessed(blobUrl, meta)
      useImageStore.getState().setProcessing(false, null)
      toast.success('Done!', { id: 'process' })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        toast.dismiss('process')
        useImageStore.getState().setProcessing(false, null)
      } else {
        setError({ message: e.message, stderr: e.stderr ?? '' })
        toast.error(e.message ?? 'Processing failed', { id: 'process' })
      }
    }
  }

  function handleCancel() {
    abortController?.abort()
  }

  function handleCopy() {
    navigator.clipboard.writeText(cmd)
    toast.success('Copied!')
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-t border-white/10 text-sm font-mono flex-shrink-0">
      <span className="flex-1 truncate text-gray-400 min-w-0 hidden md:block">$ {cmd}</span>
      <button
        onClick={handleCopy}
        title="Copy command"
        className="p-2 rounded hover:bg-white/10 text-gray-400 hover:text-white flex-shrink-0"
      >
        <Copy size={15} />
      </button>
      {isProcessing ? (
        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-sans flex-shrink-0"
        >
          <X size={14} /> Cancel
        </button>
      ) : (
        <button
          onClick={handleApply}
          disabled={!originalFile}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-sans flex-shrink-0"
        >
          <Play size={14} /> Apply
        </button>
      )}
    </div>
  )
}
