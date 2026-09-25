import { useRef, useState } from 'react'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { useImageStore } from '../../store/imageStore.js'
import { OpSection }      from '../ui/op-section.jsx'
import { LabeledSlider }  from '../ui/labeled-slider.jsx'
import { Switch }         from '../ui/switch.jsx'

const MODES = ['fit', 'fill', 'exact', 'percent']

export function TransformTab() {
  const ops          = useImageStore(s => s.ops)
  const updateOp     = useImageStore(s => s.updateOp)
  const updateOutput = useImageStore(s => s.updateOutput)
  const output       = useImageStore(s => s.output)
  const originalBlobUrl    = useImageStore(s => s.originalBlobUrl)
  const originalDimensions = useImageStore(s => s.originalDimensions)

  const [crop, setCrop] = useState({ unit: '%', x: 0, y: 0, width: 100, height: 100 })
  const imgRef   = useRef(null)
  const [lockAspect, setLockAspect] = useState(false)

  // Local text so partial input like "-" is not overwritten with the store's number.
  const [rotateText, setRotateText] = useState(String(ops.rotate))
  const [prevRotate, setPrevRotate] = useState(ops.rotate)
  if (ops.rotate !== prevRotate) {
    setPrevRotate(ops.rotate)
    setRotateText(String(ops.rotate))
  }

  // Original image aspect ratio (width ÷ height) — used to constrain resize inputs
  const aspectRatio = originalDimensions
    ? originalDimensions.width / originalDimensions.height
    : null

  function handleToggleMaintainAR(enabled) {
    setLockAspect(enabled)
    // Immediately snap height to the correct ratio when enabling
    if (enabled && ops.resize) {
      if (ops.resize.mode === 'percent') {
        updateOp('resize', { ...ops.resize, height: ops.resize.width })
      } else if (aspectRatio) {
        updateOp('resize', { ...ops.resize, height: Math.round(ops.resize.width / aspectRatio) })
      }
    }
  }

  function onCropComplete(c) {
    if (!imgRef.current || !c.width || !c.height) return
    const { naturalWidth: nw, naturalHeight: nh } = imgRef.current
    const { width: dw, height: dh } = imgRef.current.getBoundingClientRect()
    const scaleX = nw / dw
    const scaleY = nh / dh
    updateOp('crop', {
      x:      (c.x * scaleX) / nw,
      y:      (c.y * scaleY) / nh,
      width:  (c.width  * scaleX) / nw,
      height: (c.height * scaleY) / nh,
    })
  }

  function handleResizeWidth(w) {
    const r = ops.resize; if (!r) return
    const next = { ...r, width: w }
    if (lockAspect) {
      if (r.mode === 'percent') next.height = w
      else if (aspectRatio) next.height = Math.round(w / aspectRatio)
    }
    updateOp('resize', next)
  }

  function handleResizeHeight(h) {
    const r = ops.resize; if (!r) return
    const next = { ...r, height: h }
    if (lockAspect) {
      if (r.mode === 'percent') next.width = h
      else if (aspectRatio) next.width = Math.round(h * aspectRatio)
    }
    updateOp('resize', next)
  }

  function handleRotateDelta(delta) {
    updateOp('rotate', (((ops.rotate ?? 0) + delta) % 360 + 360) % 360)
  }

  function handleRotateInput(text) {
    setRotateText(text)
    const n = Number(text)
    if (text.trim() !== '' && Number.isFinite(n)) updateOp('rotate', n)
  }

  function handleModeChange(mode) {
    const r = ops.resize; if (!r) return
    if (mode === r.mode) return
    const next = { ...r, mode }
    if (mode === 'percent' && r.mode !== 'percent') {
      // Switching into percent mode: start at 100% rather than keeping stale pixel dimensions
      next.width = 100
      next.height = 100
    } else if (mode !== 'percent' && r.mode === 'percent') {
      // Switching out of percent mode: restore pixel dimensions
      next.width  = originalDimensions?.width  ?? 800
      next.height = originalDimensions?.height ?? 600
    }
    updateOp('resize', next)
  }

  return (
    <div className="space-y-3">

      {/* Auto-orient */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-300">Auto-orient (EXIF)</span>
        <Switch checked={ops.autoOrient} onCheckedChange={v => updateOp('autoOrient', v)} />
      </div>

      {/* Resize */}
      <OpSection
        label="Resize"
        enabled={!!ops.resize}
        onToggle={v => updateOp('resize', v ? {
          width:  originalDimensions?.width  ?? 800,
          height: originalDimensions?.height ?? 600,
          mode: 'fit',
        } : null)}
      >
        {ops.resize && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {MODES.map(m => (
                <button key={m}
                  onClick={() => handleModeChange(m)}
                  className={`flex-1 py-1 rounded text-xs capitalize ${ops.resize.mode === m ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                  {m}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-0.5">
                <label className="text-xs text-gray-400">{ops.resize.mode === 'percent' ? 'Width %' : 'Width px'}</label>
                <input type="number" min={1} max={ops.resize.mode === 'percent' ? 1000 : 16000} value={ops.resize.width}
                  onChange={e => handleResizeWidth(Number(e.target.value))}
                  className="w-full rounded bg-white/10 px-2 py-1 text-sm text-white" />
              </div>
              <div className="flex-1 space-y-0.5">
                <label className="text-xs text-gray-400">{ops.resize.mode === 'percent' ? 'Height %' : 'Height px'}</label>
                <input type="number" min={1} max={ops.resize.mode === 'percent' ? 1000 : 16000} value={ops.resize.height}
                  onChange={e => handleResizeHeight(Number(e.target.value))}
                  className="w-full rounded bg-white/10 px-2 py-1 text-sm text-white" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Maintain aspect ratio</span>
              <Switch checked={lockAspect} onCheckedChange={handleToggleMaintainAR} />
            </div>
          </div>
        )}
      </OpSection>

      {/* Crop */}
      <OpSection
        label="Crop"
        enabled={!!ops.crop}
        onToggle={v => updateOp('crop', v ? { x: 0, y: 0, width: 1, height: 1 } : null)}
      >
        {ops.crop && originalBlobUrl && (
          <div className="space-y-1">
            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={onCropComplete}>
              <img ref={imgRef} src={originalBlobUrl} alt="crop" className="w-full rounded" />
            </ReactCrop>
            <p className="text-xs text-gray-500 text-center">
              ~{Math.round((ops.crop.width ?? 1) * 100)}% × {Math.round((ops.crop.height ?? 1) * 100)}%
            </p>
          </div>
        )}
      </OpSection>

      {/* Rotate */}
      <OpSection label="Rotate">
        <div className="space-y-2">
          <div className="flex gap-2">
            {[[-90, '−90°'], [90, '+90°'], [180, '180°']].map(([d, label]) => (
              <button key={d} onClick={() => handleRotateDelta(d)}
                className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 text-sm text-gray-300">
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 w-24 flex-shrink-0">Free rotate °</label>
            <input type="number" min={-360} max={360} value={rotateText}
              onChange={e => handleRotateInput(e.target.value)}
              className="w-full rounded bg-white/10 px-2 py-1 text-sm text-white" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 w-24 flex-shrink-0">Background</label>
            <input type="color" value={ops.rotateBg}
              onChange={e => updateOp('rotateBg', e.target.value)}
              className="h-7 w-10 rounded cursor-pointer bg-transparent border border-white/20" />
            <span className="text-xs text-gray-400">{ops.rotateBg}</span>
          </div>
        </div>
      </OpSection>

      {/* Flip / Flop */}
      <OpSection label="Flip / Flop">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Flip (vertical)</span>
            <Switch checked={ops.flip} onCheckedChange={v => updateOp('flip', v)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Flop (horizontal)</span>
            <Switch checked={ops.flop} onCheckedChange={v => updateOp('flop', v)} />
          </div>
        </div>
      </OpSection>

      {/* Trim */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-300">Trim borders</span>
        <Switch checked={ops.trim} onCheckedChange={v => updateOp('trim', v)} />
      </div>

      {/* Strip metadata */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-300">Strip metadata</span>
        <Switch checked={output.strip} onCheckedChange={v => updateOutput('strip', v)} />
      </div>

    </div>
  )
}
