import { useImageStore } from '../../store/imageStore.js'
import { OpSection }     from '../ui/op-section.jsx'
import { LabeledSlider } from '../ui/labeled-slider.jsx'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs.jsx'

export function BlurTab() {
  const ops      = useImageStore(s => s.ops)
  const updateOp = useImageStore(s => s.updateOp)

  function clearBlur() {
    updateOp('gaussianBlur', null)
    updateOp('bilateralBlur', null)
    updateOp('motionBlur', null)
  }

  function clearSharpen() {
    updateOp('sharpen', null)
    updateOp('adaptiveSharpen', null)
  }

  return (
    <Tabs defaultValue="blur" className="space-y-3"
      onValueChange={v => { if (v === 'blur') clearSharpen(); else clearBlur() }}>
      <TabsList className="flex gap-1 bg-transparent">
        <TabsTrigger value="blur"
          className="flex-1 py-1 rounded text-xs text-gray-400 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
          Blur
        </TabsTrigger>
        <TabsTrigger value="sharpen"
          className="flex-1 py-1 rounded text-xs text-gray-400 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
          Sharpen
        </TabsTrigger>
      </TabsList>

      <TabsContent value="blur" className="space-y-3">

        <OpSection label="Gaussian Blur"
          enabled={!!ops.gaussianBlur}
          onToggle={v => updateOp('gaussianBlur', v ? { sigma: 2 } : null)}>
          {ops.gaussianBlur && (
            <LabeledSlider label="Sigma" value={ops.gaussianBlur.sigma}
              onChange={v => updateOp('gaussianBlur', { sigma: v })}
              min={0.1} max={50} step={0.1} />
          )}
        </OpSection>

        <OpSection label="Bilateral Blur"
          enabled={!!ops.bilateralBlur}
          onToggle={v => updateOp('bilateralBlur', v ? { width: 5, height: 5 } : null)}>
          {ops.bilateralBlur && (
            <div className="space-y-3">
              <p className="text-[11px] text-gray-500">Edge-preserving blur</p>
              <LabeledSlider label="Width" value={ops.bilateralBlur.width}
                onChange={v => updateOp('bilateralBlur', { ...ops.bilateralBlur, width: v })}
                min={1} max={30} />
              <LabeledSlider label="Height" value={ops.bilateralBlur.height}
                onChange={v => updateOp('bilateralBlur', { ...ops.bilateralBlur, height: v })}
                min={1} max={30} />
            </div>
          )}
        </OpSection>

        <OpSection label="Motion Blur"
          enabled={!!ops.motionBlur}
          onToggle={v => updateOp('motionBlur', v ? { radius: 10, sigma: 10, angle: -90 } : null)}>
          {ops.motionBlur && (
            <div className="space-y-3">
              <LabeledSlider label="Radius" value={ops.motionBlur.radius}
                onChange={v => updateOp('motionBlur', { ...ops.motionBlur, radius: v })}
                min={1} max={50} />
              <LabeledSlider label="Sigma" value={ops.motionBlur.sigma}
                onChange={v => updateOp('motionBlur', { ...ops.motionBlur, sigma: v })}
                min={1} max={50} />
              <LabeledSlider label="Angle" value={ops.motionBlur.angle}
                onChange={v => updateOp('motionBlur', { ...ops.motionBlur, angle: v })}
                min={-180} max={180} />
            </div>
          )}
        </OpSection>

      </TabsContent>

      <TabsContent value="sharpen" className="space-y-3">

        <OpSection label="Sharpen"
          enabled={!!ops.sharpen}
          onToggle={v => updateOp('sharpen', v ? { sigma: 1 } : null)}>
          {ops.sharpen && (
            <LabeledSlider label="Sigma" value={ops.sharpen.sigma}
              onChange={v => updateOp('sharpen', { sigma: v })}
              min={0.1} max={20} step={0.1} />
          )}
        </OpSection>

        <OpSection label="Adaptive Sharpen"
          enabled={!!ops.adaptiveSharpen}
          onToggle={v => updateOp('adaptiveSharpen', v ? { sigma: 1 } : null)}>
          {ops.adaptiveSharpen && (
            <div className="space-y-3">
              <p className="text-[11px] text-gray-500">Sharpens near edges only</p>
              <LabeledSlider label="Sigma" value={ops.adaptiveSharpen.sigma}
                onChange={v => updateOp('adaptiveSharpen', { sigma: v })}
                min={0.1} max={20} step={0.1} />
            </div>
          )}
        </OpSection>

      </TabsContent>
    </Tabs>
  )
}
