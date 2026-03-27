import { useImageStore } from '../../store/imageStore.js'
import { OpSection }     from '../ui/op-section.jsx'
import { LabeledSlider } from '../ui/labeled-slider.jsx'
import { Switch }        from '../ui/switch.jsx'

const COLORSPACES = ['sRGB', 'Gray', 'HSL', 'CMYK', 'Lab']

const BINARY_OPS = [
  { key: 'grayscale',   label: 'Grayscale'       },
  { key: 'negate',      label: 'Negate (Invert)' },
  { key: 'normalize',   label: 'Normalize'        },
]

export function ColorTab() {
  const ops      = useImageStore(s => s.ops)
  const updateOp = useImageStore(s => s.updateOp)

  return (
    <div className="space-y-3">

      <OpSection label="Brightness / Contrast"
        enabled={!!ops.brightnessContrast}
        onToggle={v => updateOp('brightnessContrast', v ? { b: 0, c: 0 } : null)}>
        {ops.brightnessContrast && (
          <div className="space-y-3">
            <LabeledSlider label="Brightness" value={ops.brightnessContrast.b}
              onChange={v => updateOp('brightnessContrast', { ...ops.brightnessContrast, b: v })}
              min={-100} max={100} />
            <LabeledSlider label="Contrast" value={ops.brightnessContrast.c}
              onChange={v => updateOp('brightnessContrast', { ...ops.brightnessContrast, c: v })}
              min={-100} max={100} />
          </div>
        )}
      </OpSection>

      <OpSection label="HSB Adjust"
        enabled={!!ops.modulate}
        onToggle={v => updateOp('modulate', v ? { brightness: 100, saturation: 100, hue: 100 } : null)}>
        {ops.modulate && (
          <div className="space-y-3">
            <LabeledSlider label="Brightness" value={ops.modulate.brightness}
              onChange={v => updateOp('modulate', { ...ops.modulate, brightness: v })}
              min={0} max={200} />
            <LabeledSlider label="Saturation" value={ops.modulate.saturation}
              onChange={v => updateOp('modulate', { ...ops.modulate, saturation: v })}
              min={0} max={200} />
            <LabeledSlider label="Hue" value={ops.modulate.hue}
              onChange={v => updateOp('modulate', { ...ops.modulate, hue: v })}
              min={0} max={200} />
          </div>
        )}
      </OpSection>

      <OpSection label="Gamma"
        enabled={ops.gamma !== null && ops.gamma !== undefined}
        onToggle={v => updateOp('gamma', v ? 1.0 : null)}>
        {ops.gamma !== null && ops.gamma !== undefined && (
          <LabeledSlider label="Gamma" value={ops.gamma}
            onChange={v => updateOp('gamma', v)} min={0.1} max={10} step={0.05} />
        )}
      </OpSection>

      <OpSection label="Levels"
        enabled={!!ops.level}
        onToggle={v => updateOp('level', v ? { black: 0, white: 100, gamma: 1.0 } : null)}>
        {ops.level && (
          <div className="space-y-3">
            <LabeledSlider label="Black point" value={ops.level.black}
              onChange={v => updateOp('level', { ...ops.level, black: v })}
              min={0} max={99} unit="%" />
            <LabeledSlider label="White point" value={ops.level.white}
              onChange={v => updateOp('level', { ...ops.level, white: v })}
              min={1} max={100} unit="%" />
            <LabeledSlider label="Midtone gamma" value={ops.level.gamma}
              onChange={v => updateOp('level', { ...ops.level, gamma: v })}
              min={0.1} max={10} step={0.05} />
          </div>
        )}
      </OpSection>

      <OpSection label="Adjustments">
        <div className="space-y-2">
          <div className="flex gap-2 mb-1">
            {[{ key: 'autoLevel', label: 'Auto Levels' }, { key: 'autoGamma', label: 'Auto Gamma' }].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => updateOp(key, !ops[key])}
                className={`flex-1 py-1 rounded text-[11px] font-medium border transition-colors ${
                  ops[key]
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-white/20 text-gray-400 hover:border-white/50 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {BINARY_OPS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{label}</span>
              <Switch checked={!!ops[key]} onCheckedChange={v => updateOp(key, v)} />
            </div>
          ))}
        </div>
      </OpSection>

      <OpSection label="Sepia Tone"
        enabled={ops.sepiaTone !== null && ops.sepiaTone !== undefined}
        onToggle={v => updateOp('sepiaTone', v ? 80 : null)}>
        {ops.sepiaTone !== null && ops.sepiaTone !== undefined && (
          <LabeledSlider label="Strength" value={ops.sepiaTone}
            onChange={v => updateOp('sepiaTone', v)} min={0} max={100} unit="%" />
        )}
      </OpSection>

      <OpSection label="Colorspace"
        enabled={!!ops.colorspace}
        onToggle={v => updateOp('colorspace', v ? 'Gray' : null)}>
        {ops.colorspace && (
          <select value={ops.colorspace}
            onChange={e => updateOp('colorspace', e.target.value)}
            className="w-full rounded bg-white/10 px-2 py-1.5 text-sm text-white">
            {COLORSPACES.map(cs => <option key={cs} value={cs}>{cs}</option>)}
          </select>
        )}
      </OpSection>

    </div>
  )
}
