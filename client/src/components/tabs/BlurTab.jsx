import { useImageStore } from '../../store/imageStore.js'
import { OpSection }     from '../ui/op-section.jsx'
import { LabeledSlider } from '../ui/labeled-slider.jsx'
import { Switch }        from '../ui/switch.jsx'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs.jsx'

export function BlurTab() {
  const ops      = useImageStore(s => s.ops)
  const updateOp = useImageStore(s => s.updateOp)

  function clearBlur() {
    updateOp('gaussianBlur', null)
    updateOp('median', null)
    updateOp('waveletDenoise', null)
    updateOp('despeckle', false)
  }

  function clearSharpen() {
    updateOp('sharpen', null)
    updateOp('unsharp', null)
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

        <OpSection label="Median Filter"
          enabled={!!ops.median}
          onToggle={v => updateOp('median', v ? { radius: 3 } : null)}>
          {ops.median && (
            <LabeledSlider label="Radius" value={ops.median.radius}
              onChange={v => updateOp('median', { radius: v })}
              min={1} max={20} />
          )}
        </OpSection>

        <OpSection label="Wavelet Denoise"
          enabled={!!ops.waveletDenoise}
          onToggle={v => updateOp('waveletDenoise', v ? { threshold: 5 } : null)}>
          {ops.waveletDenoise && (
            <LabeledSlider label="Threshold" value={ops.waveletDenoise.threshold}
              onChange={v => updateOp('waveletDenoise', { threshold: v })}
              min={0} max={30} step={0.5} unit="%" />
          )}
        </OpSection>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-300">Despeckle</span>
          <Switch checked={ops.despeckle} onCheckedChange={v => updateOp('despeckle', v)} />
        </div>

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

        <OpSection label="Unsharp Mask"
          enabled={!!ops.unsharp}
          onToggle={v => updateOp('unsharp', v ? { radius: 0, sigma: 1, amount: 1, threshold: 0.05 } : null)}>
          {ops.unsharp && (
            <div className="space-y-3">
              <LabeledSlider label="Radius" value={ops.unsharp.radius}
                onChange={v => updateOp('unsharp', { ...ops.unsharp, radius: v })}
                min={0} max={20} step={0.5} />
              <LabeledSlider label="Sigma" value={ops.unsharp.sigma}
                onChange={v => updateOp('unsharp', { ...ops.unsharp, sigma: v })}
                min={0.1} max={20} step={0.1} />
              <LabeledSlider label="Amount" value={ops.unsharp.amount}
                onChange={v => updateOp('unsharp', { ...ops.unsharp, amount: v })}
                min={0} max={5} step={0.1} />
              <LabeledSlider label="Threshold" value={ops.unsharp.threshold}
                onChange={v => updateOp('unsharp', { ...ops.unsharp, threshold: v })}
                min={0} max={1} step={0.01} />
            </div>
          )}
        </OpSection>

      </TabsContent>
    </Tabs>
  )
}
