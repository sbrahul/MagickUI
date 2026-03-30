import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { ZoomIn, ZoomOut, Zap } from 'lucide-react'
import { useImageStore } from '../store/imageStore.js'

export function PreviewPanel() {
  const originalBlobUrl    = useImageStore(s => s.originalBlobUrl)
  const processedBlobUrl   = useImageStore(s => s.processedBlobUrl)
  const processedMeta      = useImageStore(s => s.processedMeta)
  const livePreviewUrl     = useImageStore(s => s.livePreviewUrl)
  const isLivePreviewing   = useImageStore(s => s.isLivePreviewing)
  const livePreviewEnabled = useImageStore(s => s.livePreviewEnabled)
  const toggleLivePreview  = useImageStore(s => s.toggleLivePreview)
  const showOriginal       = useImageStore(s => s.showOriginal)
  const isProcessing       = useImageStore(s => s.isProcessing)
  const togglePreview      = useImageStore(s => s.togglePreview)
  const [zoom, setZoom]    = useState(1)

  // Priority: live preview > applied result > original
  const src = livePreviewUrl ?? (showOriginal ? originalBlobUrl : processedBlobUrl)
  const canToggle = !!processedBlobUrl && !isLivePreviewing

  if (!originalBlobUrl) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm select-none">
        Upload an image to get started
      </div>
    )
  }

  return (
    <div className="preview-panel relative flex-1 flex flex-col overflow-hidden bg-[#111] rounded-xl">
      <div className="absolute top-3 right-3 z-10 flex gap-1">
        <button
          onClick={toggleLivePreview}
          title={livePreviewEnabled ? 'Disable live preview' : 'Enable live preview'}
          className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs preview-btn ${
            livePreviewEnabled
              ? 'bg-blue-600 text-white'
              : 'bg-black/50 text-gray-400 hover:bg-black/80 hover:text-white'
          }`}
        >
          <Zap size={13} />
          <span className="hidden sm:inline">Live</span>
        </button>
        <button
          onClick={() => setZoom(z => Math.min(z + 0.25, 4))}
          className="preview-btn p-1.5 rounded bg-black/50 hover:bg-black/80 text-white"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="preview-btn px-2 py-1 rounded bg-black/50 hover:bg-black/80 text-white text-xs min-w-[3rem] text-center"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
          className="preview-btn p-1.5 rounded bg-black/50 hover:bg-black/80 text-white"
        >
          <ZoomOut size={16} />
        </button>
      </div>

      {isLivePreviewing && (
        <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded bg-blue-600/80 text-xs text-white flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Live preview
        </div>
      )}

      {canToggle && (
        <button
          onClick={togglePreview}
          className="absolute top-3 left-3 z-10 px-2 py-1 rounded bg-black/60 text-xs text-white hover:bg-black/80"
        >
          {showOriginal ? 'Before' : 'After'} · click to toggle
        </button>
      )}

      <div className="flex-1 overflow-auto flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img
            key={src}
            src={src}
            alt={isLivePreviewing ? 'live preview' : showOriginal ? 'original' : 'processed'}
            onClick={canToggle ? togglePreview : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center',
              cursor: canToggle ? 'pointer' : 'default',
            }}
            className="max-w-full max-h-full object-contain rounded"
          />
        </AnimatePresence>
      </div>

      <div className="px-4 py-2 bg-black/40 text-xs text-gray-400 flex gap-4">
        {!showOriginal && !isLivePreviewing && processedMeta ? (
          <>
            <span>{processedMeta.format?.toUpperCase()}</span>
            <span>{(processedMeta.sizeBytes / 1024).toFixed(1)} KB</span>
          </>
        ) : (
          <span className="invisible">placeholder</span>
        )}
      </div>

      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl"
          >
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
