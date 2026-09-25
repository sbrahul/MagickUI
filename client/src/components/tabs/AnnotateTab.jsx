import { useImageStore }  from '../../store/imageStore.js'
import { OpSection }      from '../ui/op-section.jsx'
import { LabeledSlider }  from '../ui/labeled-slider.jsx'
import { NumberInput }    from '../ui/number-input.jsx'
import { ColorField }     from '../ui/color-field.jsx'
import { GravityGrid }    from '../ui/gravity-grid.jsx'

const ANNOTATE_DEFAULTS = {
  text: '', gravity: 'SouthEast', size: 36,
  color: '#ffffff', opacity: 100, x: 10, y: 10, rotation: 0,
}

export function AnnotateTab() {
  const ops      = useImageStore(s => s.ops)
  const updateOp = useImageStore(s => s.updateOp)

  const ann = ops.annotate

  function update(patch) {
    updateOp('annotate', { ...ANNOTATE_DEFAULTS, ...ann, ...patch })
  }

  function handleText(text) {
    if (!text) { updateOp('annotate', null); return }
    updateOp('annotate', { ...ANNOTATE_DEFAULTS, ...ann, text })
  }

  return (
    <div className="space-y-3">

      {/* Text */}
      <OpSection label="Text">
        <textarea
          maxLength={500}
          placeholder="Watermark text…"
          value={ann?.text ?? ''}
          onChange={e => handleText(e.target.value)}
          className="w-full rounded bg-white/10 px-3 py-2 text-sm text-white resize-none placeholder-gray-600"
          rows={2}
        />
      </OpSection>

      {ann && (
        <>
          {/* Gravity */}
          <OpSection label="Position (Gravity)">
            <GravityGrid value={ann.gravity} onChange={g => update({ gravity: g })} />
          </OpSection>

          {/* Size */}
          <LabeledSlider label="Font size" value={ann.size}
            onChange={v => update({ size: v })} min={6} max={500} unit="px" />

          {/* Color */}
          <OpSection label="Font colour">
            <ColorField label="Font colour" value={ann.color} onChange={c => update({ color: c })} />
          </OpSection>

          {/* Opacity */}
          <LabeledSlider label="Opacity" value={ann.opacity}
            onChange={v => update({ opacity: v })} min={0} max={100} unit="%" />

          {/* X / Y offset */}
          <OpSection label="X / Y offset">
            <div className="flex gap-2">
              <div className="flex-1 space-y-0.5">
                <label className="text-xs text-gray-400">X</label>
                <NumberInput min={-5000} max={5000} value={ann.x}
                  onChange={v => update({ x: v })}
                  className="w-full rounded bg-white/10 px-2 py-1 text-sm text-white" />
              </div>
              <div className="flex-1 space-y-0.5">
                <label className="text-xs text-gray-400">Y</label>
                <NumberInput min={-5000} max={5000} value={ann.y}
                  onChange={v => update({ y: v })}
                  className="w-full rounded bg-white/10 px-2 py-1 text-sm text-white" />
              </div>
            </div>
          </OpSection>

          {/* Rotation */}
          <LabeledSlider label="Text rotation" value={ann.rotation}
            onChange={v => update({ rotation: v })} min={-360} max={360} unit="°" />
        </>
      )}

      {/* Border */}
      <OpSection label="Border"
        enabled={!!ops.border}
        onToggle={v => updateOp('border', v ? { width: 10, color: '#000000' } : null)}>
        {ops.border && (
          <div className="space-y-3">
            <LabeledSlider label="Width" value={ops.border.width}
              onChange={v => updateOp('border', { ...ops.border, width: v })}
              min={1} max={500} unit="px" />
            <div className="flex items-center gap-2">
              <input type="color" value={ops.border.color}
                onChange={e => updateOp('border', { ...ops.border, color: e.target.value })}
                className="h-7 w-10 rounded cursor-pointer bg-transparent border border-white/20" />
              <span className="text-xs text-gray-400">{ops.border.color}</span>
            </div>
          </div>
        )}
      </OpSection>

    </div>
  )
}
