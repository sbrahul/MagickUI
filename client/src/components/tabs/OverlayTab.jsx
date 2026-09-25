import { useDropzone }   from 'react-dropzone'
import { toast }         from 'sonner'
import { useImageStore } from '../../store/imageStore.js'
import { GravityGrid }   from '../ui/gravity-grid.jsx'
import { OpSection }     from '../ui/op-section.jsx'
import { LabeledSlider } from '../ui/labeled-slider.jsx'
import { ColorField }    from '../ui/color-field.jsx'
import { needsAlpha }    from '../../lib/buildOps.js'
import { dropsAlpha }    from '../../lib/formats.js'

export function OverlayTab() {
  const ops          = useImageStore(s => s.ops)
  const output       = useImageStore(s => s.output)
  const updateOp     = useImageStore(s => s.updateOp)
  const updateOutput = useImageStore(s => s.updateOutput)
  const setWatermark = useImageStore(s => s.setWatermark)

  const wm = ops.watermark
  const updateWatermark = patch => updateOp('watermark', { ...wm, ...patch })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/png': ['.png'], 'image/webp': ['.webp'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/gif': ['.gif'], 'image/avif': ['.avif'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    onDropAccepted: ([file]) => setWatermark(file),
    onDropRejected: ([r]) => toast.error(`${r.file.name}: use a PNG, WebP, JPEG, GIF or AVIF logo up to 10 MB`),
  })

  const alphaLost = needsAlpha(ops) && dropsAlpha(output)

  return (
    <div className="space-y-3">

      {alphaLost && (
        <div role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
          <p className="text-xs text-amber-200">
            {output.format.toUpperCase()} has no transparency: transparent areas become {output.flattenBg}.
          </p>
          <button onClick={() => updateOutput('format', 'png')}
            className="px-2 py-1 rounded text-xs bg-amber-500/80 hover:bg-amber-500 text-black">
            Switch to PNG
          </button>
        </div>
      )}
      {needsAlpha(ops) && output.format === 'gif' && (
        <p className="text-xs text-gray-400">GIF transparency is on or off per pixel, so soft edges look jagged.</p>
      )}

      <OpSection label="Make a colour transparent"
        enabled={!!ops.transparent}
        onToggle={v => updateOp('transparent', v ? { color: '#ffffff', fuzz: 10 } : null)}>
        {ops.transparent && (
          <div className="space-y-3">
            <ColorField label="Colour to remove" value={ops.transparent.color}
              onChange={c => updateOp('transparent', { ...ops.transparent, color: c })} />
            <LabeledSlider label="Tolerance" value={ops.transparent.fuzz}
              onChange={v => updateOp('transparent', { ...ops.transparent, fuzz: v })} min={0} max={100} unit="%" />
          </div>
        )}
      </OpSection>

      <OpSection label="Drop shadow"
        enabled={!!ops.shadow}
        onToggle={v => updateOp('shadow', v ? { x: 10, y: 10, sigma: 6, opacity: 60, color: '#000000' } : null)}>
        {ops.shadow && (
          <div className="space-y-3">
            <LabeledSlider label="Offset X" value={ops.shadow.x}
              onChange={v => updateOp('shadow', { ...ops.shadow, x: v })} min={-100} max={100} unit="px" />
            <LabeledSlider label="Offset Y" value={ops.shadow.y}
              onChange={v => updateOp('shadow', { ...ops.shadow, y: v })} min={-100} max={100} unit="px" />
            <LabeledSlider label="Blur" value={ops.shadow.sigma}
              onChange={v => updateOp('shadow', { ...ops.shadow, sigma: v })} min={0} max={50} />
            <LabeledSlider label="Opacity" value={ops.shadow.opacity}
              onChange={v => updateOp('shadow', { ...ops.shadow, opacity: v })} min={0} max={100} unit="%" />
            <ColorField label="Shadow colour" value={ops.shadow.color}
              onChange={c => updateOp('shadow', { ...ops.shadow, color: c })} />
          </div>
        )}
      </OpSection>

      <OpSection label="Image watermark">
        {!wm ? (
          <div {...getRootProps()}
            className={`rounded-lg border-2 border-dashed p-4 text-center text-xs cursor-pointer ${isDragActive ? 'border-blue-500 text-blue-400' : 'border-white/20 text-gray-400 hover:border-white/40'}`}>
            <input {...getInputProps()} data-testid="watermark-input" />
            Drop a logo here, or click to choose (PNG with transparency works best)
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img src={wm.url} alt="watermark" className="h-12 w-12 rounded object-contain bg-white/10" />
              <span className="flex-1 min-w-0 truncate text-xs text-gray-300">{wm.file.name}</span>
              <button onClick={() => setWatermark(null)}
                className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded">
                Remove
              </button>
            </div>
            <GravityGrid value={wm.gravity} onChange={g => updateWatermark({ gravity: g })} />
            <LabeledSlider label="Size (% of image width)" value={wm.scale}
              onChange={v => updateWatermark({ scale: v })} min={1} max={100} unit="%" />
            <LabeledSlider label="Opacity" value={wm.opacity}
              onChange={v => updateWatermark({ opacity: v })} min={0} max={100} unit="%" />
            <LabeledSlider label="Offset X (% of width)" value={wm.x}
              onChange={v => updateWatermark({ x: v })} min={0} max={50} step={0.5} unit="%" />
            <LabeledSlider label="Offset Y (% of width)" value={wm.y}
              onChange={v => updateWatermark({ y: v })} min={0} max={50} step={0.5} unit="%" />
          </div>
        )}
      </OpSection>

    </div>
  )
}
