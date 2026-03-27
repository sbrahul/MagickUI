import { useState } from 'react'
import { Copy, Play, X, Code2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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

  const [cmdOpen, setCmdOpen] = useState(false)

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
    <>
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-t border-white/10 text-sm font-mono flex-shrink-0">
        <span className="flex-1 truncate text-gray-400 min-w-0 hidden md:block">$ {cmd}</span>
        {/* Mobile: expand command */}
        <button
          onClick={() => setCmdOpen(true)}
          title="View full command"
          className="md:hidden p-2 rounded hover:bg-white/10 text-gray-400 hover:text-white flex-shrink-0"
        >
          <Code2 size={15} />
        </button>
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

      {/* Mobile command sheet */}
      <AnimatePresence>
        {cmdOpen && (
          <>
            <motion.div
              key="cmd-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCmdOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/60"
            />
            <motion.div
              key="cmd-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-gray-900 p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-sans">Command</span>
                <button onClick={() => setCmdOpen(false)} className="p-1 text-gray-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <pre className="text-xs text-gray-200 bg-black/40 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
                $ {cmd}
              </pre>
              <button
                onClick={() => { handleCopy(); setCmdOpen(false) }}
                className="flex items-center justify-center gap-2 py-2 rounded bg-white/10 hover:bg-white/20 text-sm text-gray-200 font-sans"
              >
                <Copy size={14} /> Copy
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
