import { useImageStore } from '../../store/imageStore.js'
import { Switch }        from '../ui/switch.jsx'
import { LabeledSlider } from '../ui/labeled-slider.jsx'

const EFFECTS = [
  { key: 'charcoal',  label: '✏️ Charcoal',   defaults: { radius: 2 },
    sliders: [{ k: 'radius', label: 'Radius', min: 0, max: 10 }] },
  { key: 'edge',      label: '🔍 Edge Detect', defaults: { radius: 1 },
    sliders: [] },
  { key: 'solarize',  label: '☀️ Solarize',    defaults: { threshold: 50 },
    sliders: [{ k: 'threshold', label: 'Threshold', min: 0, max: 100, unit: '%' }] },
  { key: 'paint',     label: '🖌️ Oil Paint',   defaults: { radius: 3 },
    sliders: [{ k: 'radius', label: 'Radius', min: 0, max: 10 }] },
  { key: 'vignette',  label: '🔭 Vignette',    defaults: { sigma: 10 },
    sliders: [{ k: 'sigma', label: 'Sigma', min: 0.1, max: 50, step: 0.1 }] },
  { key: 'wave',      label: '〰️ Wave',         defaults: { amplitude: 25, wavelength: 150 },
    sliders: [
      { k: 'amplitude',  label: 'Amplitude',  min: 1, max: 200 },
      { k: 'wavelength', label: 'Wavelength', min: 1, max: 500 },
    ] },
]

export function EffectsTab() {
  const ops      = useImageStore(s => s.ops)
  const updateOp = useImageStore(s => s.updateOp)

  return (
    <div className="grid grid-cols-1 gap-3">
      {EFFECTS.map(({ key, label, defaults, sliders }) => {
        const enabled = !!ops[key]
        return (
          <div key={key} className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-300">{label}</span>
              <Switch checked={enabled}
                onCheckedChange={v => updateOp(key, v ? { ...defaults } : null)} />
            </div>
            {enabled && sliders.map(s => (
              <LabeledSlider key={s.k} label={s.label} value={ops[key][s.k]}
                onChange={v => updateOp(key, { ...ops[key], [s.k]: v })}
                min={s.min} max={s.max} step={s.step ?? 1} unit={s.unit ?? ''} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
