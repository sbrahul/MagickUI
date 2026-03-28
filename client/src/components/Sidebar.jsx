import { X, Download } from 'lucide-react'
import { useImageStore } from '../store/imageStore.js'
import { processImage } from '../api/client.js'
import { UploadZone }    from './UploadZone.jsx'
import { FormatPicker }  from './FormatPicker.jsx'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs.jsx'
import { TransformTab }  from './tabs/TransformTab.jsx'
import { ColorTab }      from './tabs/ColorTab.jsx'
import { BlurTab }       from './tabs/BlurTab.jsx'
import { EffectsTab }    from './tabs/EffectsTab.jsx'
import { AnnotateTab }   from './tabs/AnnotateTab.jsx'
import { OutputTab }     from './tabs/OutputTab.jsx'

const TABS = [
  { id: 'transform', label: 'Transform', Component: TransformTab },
  { id: 'color',     label: 'Color',     Component: ColorTab     },
  { id: 'blur',      label: 'Blur',      Component: BlurTab      },
  { id: 'effects',   label: 'Effects',   Component: EffectsTab   },
  { id: 'annotate',  label: 'Annotate',  Component: AnnotateTab  },
  { id: 'output',    label: 'Output',    Component: OutputTab    },
]

export function Sidebar() {
  const originalFile  = useImageStore(s => s.originalFile)
  const ops           = useImageStore(s => s.ops)
  const processedBlobUrl = useImageStore(s => s.processedBlobUrl)
  const processedMeta    = useImageStore(s => s.processedMeta)
  const output           = useImageStore(s => s.output)
  const isProcessing  = useImageStore(s => s.isProcessing)
  const setProcessing = useImageStore(s => s.setProcessing)
  const setProcessed  = useImageStore(s => s.setProcessed)
  const setError      = useImageStore(s => s.setError)
  const errorDetail   = useImageStore(s => s.errorDetail)
  const resetOps      = useImageStore(s => s.resetOps)

  async function applyChanges() {
    if (!originalFile || isProcessing) return
    setProcessing(true)
    try {
      const { blobUrl, meta } = await processImage({ file: originalFile, ops, output })
      setProcessed(blobUrl, meta)
    } catch (err) {
      setError(err)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <aside className="w-80 flex-shrink-0 flex flex-col bg-gray-900 border-r border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <UploadZone />
      </div>

      <FormatPicker />

      <Tabs defaultValue="transform" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="flex px-2 pt-2 gap-1 bg-transparent flex-wrap">
          {TABS.map(t => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="text-xs px-2 py-1 rounded data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 dark:hover:text-white hover:text-gray-900 hover:bg-black/10"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {TABS.map(({ id, Component }) => (
            <TabsContent key={id} value={id} className="p-4 space-y-4">
              <Component />
            </TabsContent>
          ))}
        </div>
      </Tabs>

      <div className="p-3 border-t border-white/10 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={applyChanges}
            disabled={!originalFile || isProcessing}
            className="flex-1 py-2 rounded text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            {isProcessing ? 'Processing…' : 'Apply'}
          </button>
          {processedBlobUrl && (
            <a
              href={processedBlobUrl}
              download={`output.${output.format}`}
              title={processedMeta ? `${(processedMeta.sizeBytes / 1024).toFixed(1)} KB` : undefined}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm font-medium bg-green-700 hover:bg-green-600 text-white transition-colors"
            >
              <Download size={14} />
            </a>
          )}
        </div>
        <button
          onClick={resetOps}
          className="w-full py-1.5 rounded text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          Reset all settings
        </button>
      </div>

      {errorDetail && (
        <div className="p-3 border-t border-red-900/50 bg-red-950/30 text-xs text-red-300 max-h-32 overflow-y-auto font-mono relative">
          <button
            onClick={() => useImageStore.getState().setError(null)}
            className="absolute top-2 right-2 text-red-400 hover:text-red-200"
            aria-label="Dismiss error"
          >
            <X size={12} />
          </button>
          <p className="font-sans font-medium mb-1 text-red-400 pr-5">{errorDetail.message}</p>
          {errorDetail.stderr && <pre className="whitespace-pre-wrap">{errorDetail.stderr}</pre>}
        </div>
      )}
    </aside>
  )
}
