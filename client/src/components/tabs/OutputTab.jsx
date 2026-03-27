import { Download } from 'lucide-react'
import { useImageStore } from '../../store/imageStore.js'
import { LabeledSlider } from '../ui/labeled-slider.jsx'
import { Switch }        from '../ui/switch.jsx'

export function OutputTab() {
  const output           = useImageStore(s => s.output)
  const updateOutput     = useImageStore(s => s.updateOutput)
  const processedBlobUrl = useImageStore(s => s.processedBlobUrl)
  const processedMeta    = useImageStore(s => s.processedMeta)

  return (
    <div className="space-y-3">

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
