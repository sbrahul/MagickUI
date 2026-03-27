import { HexColorPicker } from 'react-colorful'
import { useState } from 'react'
import { useImageStore }  from '../../store/imageStore.js'
import { OpSection }      from '../ui/op-section.jsx'
import { LabeledSlider }  from '../ui/labeled-slider.jsx'
import { Switch }         from '../ui/switch.jsx'

const GRAVITY_GRID = [
  ['NorthWest', 'North', 'NorthEast'],
  ['West',      'Center', 'East'    ],
  ['SouthWest', 'South', 'SouthEast'],
]
const GRAVITY_LABELS = {
  NorthWest: 'NW', North: 'N', NorthEast: 'NE',
  West: 'W', Center: 'C', East: 'E',
  SouthWest: 'SW', South: 'S', SouthEast: 'SE',
}

const ANNOTATE_DEFAULTS = {
  text: '', gravity: 'SouthEast', size: 36,
  color: '#ffffff', opacity: 100, x: 10, y: 10, rotation: 0,
}

export function AnnotateTab() {
  const ops      = useImageStore(s => s.ops)
  const updateOp = useImageStore(s => s.updateOp)
  const [showPicker, setShowPicker] = useState(false)

  const ann = ops.annotate

  function update(patch) {
    updateOp('annotate', { ...ANNOTATE_DEFAULTS, ...ann, ...patch })
  }

  function handleText(text) {
    if (!text) { updateOp('annotate', null); return }
    updateOp('annotate', { ...ANNOTATE_DEFAULTS, ...ann, text })
  }

  return (
    <div className="space-y-5">

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
            <div className="grid grid-cols-3 gap-1 w-fit mx-auto">
              {GRAVITY_GRID.map(row =>
                row.map(g => (
                  <button key={g}
                    onClick={() => update({ gravity: g })}
                    className={`w-10 h-10 rounded text-xs font-medium transition-colors ${ann.gravity === g ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}>
                    {GRAVITY_LABELS[g]}
                  </button>
                ))
              )}
            </div>
          </OpSection>

          {/* Size */}
          <LabeledSlider label="Font size" value={ann.size}
            onChange={v => update({ size: v })} min={6} max={500} unit="px" />

          {/* Color */}
          <OpSection label="Font colour">
            <div className="space-y-2">
              <button
                onClick={() => setShowPicker(p => !p)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-white"
              >
                <span className="inline-block w-6 h-6 rounded border border-white/20"
                  style={{ backgroundColor: ann.color }} />
                {ann.color}
              </button>
              {showPicker && (
                <div>
                  <HexColorPicker color={ann.color} onChange={c => update({ color: c })} />
                  <input type="text" value={ann.color}
                    onChange={e => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && update({ color: e.target.value })}
                    className="mt-1 w-full rounded bg-white/10 px-2 py-1 text-xs text-white font-mono" />
                </div>
              )}
            </div>
          </OpSection>

          {/* Opacity */}
          <LabeledSlider label="Opacity" value={ann.opacity}
            onChange={v => update({ opacity: v })} min={0} max={100} unit="%" />

          {/* X / Y offset */}
          <OpSection label="X / Y offset">
            <div className="flex gap-2">
              <div className="flex-1 space-y-0.5">
                <label className="text-xs text-gray-400">X</label>
                <input type="number" min={-5000} max={5000} value={ann.x}
                  onChange={e => update({ x: Number(e.target.value) })}
                  className="w-full rounded bg-white/10 px-2 py-1 text-sm text-white" />
              </div>
              <div className="flex-1 space-y-0.5">
                <label className="text-xs text-gray-400">Y</label>
                <input type="number" min={-5000} max={5000} value={ann.y}
                  onChange={e => update({ y: Number(e.target.value) })}
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
