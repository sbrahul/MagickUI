import { Download } from 'lucide-react'
import { useImageStore } from '../../store/imageStore.js'
import { OpSection }     from '../ui/op-section.jsx'
import { LabeledSlider } from '../ui/labeled-slider.jsx'
import { Switch }        from '../ui/switch.jsx'
import { cn }            from '../../lib/utils.js'

const FORMATS = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png',  label: 'PNG'  },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'tiff', label: 'TIFF' },
  { value: 'gif',  label: 'GIF'  },
]

export function OutputTab() {
  const output           = useImageStore(s => s.output)
  const updateOutput     = useImageStore(s => s.updateOutput)
  const capabilities     = useImageStore(s => s.capabilities)
  const processedBlobUrl = useImageStore(s => s.processedBlobUrl)
  const processedMeta    = useImageStore(s => s.processedMeta)

  const supported = capabilities?.outputFormats ?? []

  return (
    <div className="space-y-5">

      {/* Format selector */}
      <OpSection label="Output Format">
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map(f => {
            const available = supported.length === 0 || supported.includes(f.value)
            return (
              <button key={f.value} disabled={!available}
                onClick={() => updateOutput('format', f.value)}
                title={!available ? 'Not supported by this ImageMagick build' : undefined}
                className={cn(
                  'py-1.5 rounded text-sm border transition-colors',
                  output.format === f.value
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : available
                    ? 'border-white/20 text-gray-300 hover:border-white/50'
                    : 'border-white/10 text-gray-600 cursor-not-allowed opacity-40'
                )}>
                {f.label}
              </button>
            )
          })}
        </div>
      </OpSection>

      {/* Quality */}
      {['jpeg', 'webp', 'avif'].includes(output.format) && (
        <LabeledSlider label="Quality" value={output.quality}
          onChange={v => updateOutput('quality', v)} min={1} max={100} />
      )}

      {/* Progressive JPEG */}
      {output.format === 'jpeg' && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-300">Progressive JPEG</span>
          <Switch checked={output.interlace} onCheckedChange={v => updateOutput('interlace', v)} />
        </div>
      )}

      {/* Lossless WebP */}
      {output.format === 'webp' && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-300">Lossless WebP</span>
          <Switch checked={output.losslessWebp} onCheckedChange={v => updateOutput('losslessWebp', v)} />
        </div>
      )}

      {/* Strip metadata */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-300">Strip metadata (EXIF, ICC)</span>
        <Switch checked={output.strip} onCheckedChange={v => updateOutput('strip', v)} />
      </div>

      {/* Download */}
      {processedBlobUrl && (
        <a href={processedBlobUrl} download={`output.${output.format}`}
          className="flex items-center justify-center gap-2 w-full py-2 rounded bg-green-700 hover:bg-green-600 text-white text-sm font-medium">
          <Download size={15} />
          Download output.{output.format}
          {processedMeta && (
            <span className="text-green-300 text-xs">({(processedMeta.sizeBytes / 1024).toFixed(1)} KB)</span>
          )}
        </a>
      )}

    </div>
  )
}
