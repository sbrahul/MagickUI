import { useImageStore } from '../../store/imageStore.js'
import { LabeledSlider } from '../ui/labeled-slider.jsx'
import { Switch }        from '../ui/switch.jsx'
import { NumberInput }   from '../ui/number-input.jsx'
import { dropsAlpha, usesQuality } from '../../lib/formats.js'

export function OutputTab() {
  const output           = useImageStore(s => s.output)
  const updateOutput     = useImageStore(s => s.updateOutput)

  const sizeLimited = output.format === 'jpeg' && !!output.jpegMaxKb

  return (
    <div className="space-y-3">

      {/* Quality */}
      {usesQuality(output.format) && (
        <div className={sizeLimited ? 'opacity-40 pointer-events-none' : undefined}>
          <LabeledSlider label={output.format === 'pdf' ? 'Quality (100 = lossless)' : 'Quality'}
            value={output.quality} onChange={v => updateOutput('quality', v)} min={1} max={100} />
        </div>
      )}

      {/* JPEG file size limit */}
      {output.format === 'jpeg' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-300">Limit file size</span>
            <Switch aria-label="Limit file size" checked={sizeLimited}
              onCheckedChange={v => updateOutput('jpegMaxKb', v ? 200 : null)} />
          </div>
          {sizeLimited && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 w-24 flex-shrink-0">Max size KB</label>
              <NumberInput min={1} max={100000} value={output.jpegMaxKb}
                onChange={v => updateOutput('jpegMaxKb', Math.max(1, v))}
                className="w-full rounded bg-white/10 px-2 py-1 text-sm text-white" />
            </div>
          )}
        </div>
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

      {/* Colour reduction */}
      {(output.format === 'png' || output.format === 'gif') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-300">Reduce colours</span>
            <Switch aria-label="Reduce colours" checked={!!output.colors}
              onCheckedChange={v => updateOutput('colors', v ? 64 : null)} />
          </div>
          {!!output.colors && (
            <>
              <LabeledSlider label="Colours" value={output.colors}
                onChange={v => updateOutput('colors', v)} min={2} max={256} />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Dither</span>
                <Switch checked={output.dither} onCheckedChange={v => updateOutput('dither', v)} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Background for formats without transparency */}
      {dropsAlpha(output) && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-300 flex-1">Transparent areas become</label>
          <input type="color" value={output.flattenBg}
            onChange={e => updateOutput('flattenBg', e.target.value)}
            className="h-7 w-10 rounded cursor-pointer bg-transparent border border-white/20" />
          <span className="text-xs text-gray-400">{output.flattenBg}</span>
        </div>
      )}

      {/* MP4 loop count */}
      {output.format === 'mp4' && (
        <LabeledSlider label="Loops" value={output.videoLoops}
          onChange={v => updateOutput('videoLoops', v)} min={1} max={10} step={1} />
      )}

      {/* ICO note */}
      {output.format === 'ico' && (
        <p className="text-xs text-gray-400">Saved with 256, 48, 32 and 16 px sizes (up to the image size).</p>
      )}

      {/* Strip metadata */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-300">Strip metadata (EXIF, ICC)</span>
        <Switch checked={output.strip} onCheckedChange={v => updateOutput('strip', v)} />
      </div>

    </div>
  )
}
