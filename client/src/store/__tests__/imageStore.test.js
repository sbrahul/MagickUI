import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useImageStore } from '../../store/imageStore.js'

// Reset store between tests
beforeEach(() => {
  useImageStore.setState(useImageStore.getInitialState?.() ?? {
    originalFile: null,
    originalBlobUrl: null,
    originalDimensions: null,
    processedBlobUrl: null,
    processedMeta: null,
    isProcessing: false,
    errorDetail: null,
    livePreviewUrl: null,
    isLivePreviewing: false,
    livePreviewEnabled: true,
    showOriginal: true,
    ops: useImageStore.getState().ops,
    output: useImageStore.getState().output,
  })
})

describe('imageStore – DEFAULT_OPS', () => {
  it('includes new wasm ops: autoLevel, autoGamma', () => {
    const { ops } = useImageStore.getState()
    expect(ops).toHaveProperty('autoLevel', false)
    expect(ops).toHaveProperty('autoGamma', false)
  })

  it('includes new wasm ops: bilateralBlur, motionBlur, adaptiveSharpen', () => {
    const { ops } = useImageStore.getState()
    expect(ops).toHaveProperty('bilateralBlur', null)
    expect(ops).toHaveProperty('motionBlur', null)
    expect(ops).toHaveProperty('adaptiveSharpen', null)
  })

  it('does NOT include removed ops: equalize, whiteBalance', () => {
    const { ops } = useImageStore.getState()
    expect(ops).not.toHaveProperty('equalize')
    expect(ops).not.toHaveProperty('whiteBalance')
  })

  it('does NOT include removed ops: unsharp, median, despeckle, waveletDenoise', () => {
    const { ops } = useImageStore.getState()
    expect(ops).not.toHaveProperty('unsharp')
    expect(ops).not.toHaveProperty('median')
    expect(ops).not.toHaveProperty('despeckle')
    expect(ops).not.toHaveProperty('waveletDenoise')
  })

  it('does NOT include removed effects: emboss, sketch, spread, swirl, implode, posterize', () => {
    const { ops } = useImageStore.getState()
    expect(ops).not.toHaveProperty('emboss')
    expect(ops).not.toHaveProperty('sketch')
    expect(ops).not.toHaveProperty('spread')
    expect(ops).not.toHaveProperty('swirl')
    expect(ops).not.toHaveProperty('implode')
    expect(ops).not.toHaveProperty('posterize')
  })

  it('includes the new ops, off by default, and keeps posterize absent', () => {
    const { ops } = useImageStore.getState()
    for (const key of ['deskew', 'transparent', 'clahe', 'grain', 'threshold', 'quantize', 'shadow', 'watermark']) {
      expect(ops).toHaveProperty(key, null)
    }
    expect(ops).not.toHaveProperty('posterize')
  })

  it('retains core transform ops', () => {
    const { ops } = useImageStore.getState()
    expect(ops).toHaveProperty('autoOrient')
    expect(ops).toHaveProperty('crop')
    expect(ops).toHaveProperty('resize')
    expect(ops).toHaveProperty('rotate')
    expect(ops).toHaveProperty('flip')
    expect(ops).toHaveProperty('flop')
    expect(ops).toHaveProperty('trim')
  })

  it('retains remaining effects: charcoal, edge, solarize, paint, vignette, wave', () => {
    const { ops } = useImageStore.getState()
    expect(ops).toHaveProperty('charcoal')
    expect(ops).toHaveProperty('edge')
    expect(ops).toHaveProperty('solarize')
    expect(ops).toHaveProperty('paint')
    expect(ops).toHaveProperty('vignette')
    expect(ops).toHaveProperty('wave')
  })
})

describe('imageStore – updateOp', () => {
  it('updates a single op key without affecting others', () => {
    const { updateOp } = useImageStore.getState()
    updateOp('autoLevel', true)
    const { ops } = useImageStore.getState()
    expect(ops.autoLevel).toBe(true)
    expect(ops.autoGamma).toBe(false) // unchanged
  })

  it('sets bilateralBlur object', () => {
    const { updateOp } = useImageStore.getState()
    updateOp('bilateralBlur', { width: 5, height: 5 })
    expect(useImageStore.getState().ops.bilateralBlur).toEqual({ width: 5, height: 5 })
  })
})

describe('imageStore – updateOutput', () => {
  it('updates output format', () => {
    const { updateOutput } = useImageStore.getState()
    updateOutput('format', 'webp')
    expect(useImageStore.getState().output.format).toBe('webp')
  })
})

describe('imageStore – live preview', () => {
  it('is enabled by default', () => {
    expect(useImageStore.getState().livePreviewEnabled).toBe(true)
  })

  it('toggleLivePreview turns it off and clears the preview URL', () => {
    useImageStore.getState().toggleLivePreview()
    const s = useImageStore.getState()
    expect(s.livePreviewEnabled).toBe(false)
    expect(s.livePreviewUrl).toBeNull()
    expect(s.isLivePreviewing).toBe(false)
  })
})

describe('imageStore – processed result URLs', () => {
  beforeEach(() => {
    URL.revokeObjectURL = vi.fn()
  })

  it('setProcessed stores the file URL and the preview URL', () => {
    useImageStore.getState().setProcessed({ blobUrl: 'blob:a', previewUrl: 'blob:a-prev', meta: { format: 'tiff' } })
    const s = useImageStore.getState()
    expect(s.processedBlobUrl).toBe('blob:a')
    expect(s.processedPreviewUrl).toBe('blob:a-prev')
    expect(s.showOriginal).toBe(false)
  })

  it('a second setProcessed revokes both old URLs', () => {
    const { setProcessed } = useImageStore.getState()
    setProcessed({ blobUrl: 'blob:a', previewUrl: 'blob:a-prev', meta: {} })
    setProcessed({ blobUrl: 'blob:b', meta: {} })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:a')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:a-prev')
    expect(useImageStore.getState().processedPreviewUrl).toBeNull()
  })

  it('cleanup revokes the preview URL', () => {
    useImageStore.getState().setProcessed({ blobUrl: 'blob:a', previewUrl: 'blob:a-prev', meta: {} })
    useImageStore.getState().cleanup()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:a-prev')
    expect(useImageStore.getState().processedPreviewUrl).toBeNull()
  })
})

describe('imageStore – display conversion', () => {
  beforeEach(() => {
    URL.revokeObjectURL = vi.fn()
  })

  it('setDisplayUrl stores the converted image size', () => {
    useImageStore.getState().setDisplayUrl('blob:converted', { width: 4000, height: 3000 })
    const s = useImageStore.getState()
    expect(s.originalBlobUrl).toBe('blob:converted')
    expect(s.originalDimensions).toEqual({ width: 4000, height: 3000 })
  })

  it('setDecoding sets the flag', () => {
    useImageStore.getState().setDecoding(true)
    expect(useImageStore.getState().isDecoding).toBe(true)
  })
})

describe('imageStore – watermark', () => {
  beforeEach(() => {
    let n = 0
    URL.createObjectURL = vi.fn(() => `blob:wm${++n}`)
    URL.revokeObjectURL = vi.fn()
  })
  const logo = name => new File([new Uint8Array([1])], name, { type: 'image/png' })

  it('setWatermark stores the file with defaults and a URL', () => {
    useImageStore.getState().setWatermark(logo('a.png'))
    const wm = useImageStore.getState().ops.watermark
    expect(wm).toMatchObject({ gravity: 'SouthEast', scale: 20, opacity: 70, url: 'blob:wm1' })
    expect(wm.file.name).toBe('a.png')
  })

  it('replacing the logo keeps settings and revokes the old URL', () => {
    const { setWatermark, updateOp } = useImageStore.getState()
    setWatermark(logo('a.png'))
    updateOp('watermark', { ...useImageStore.getState().ops.watermark, scale: 40 })
    setWatermark(logo('b.png'))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:wm1')
    expect(useImageStore.getState().ops.watermark).toMatchObject({ scale: 40, url: 'blob:wm2' })
  })

  it('setWatermark(null), resetOps and setFile revoke the logo URL', () => {
    const s = useImageStore.getState()
    s.setWatermark(logo('a.png')); s.setWatermark(null)
    expect(URL.revokeObjectURL).toHaveBeenLastCalledWith('blob:wm1')
    expect(useImageStore.getState().ops.watermark).toBeNull()
    s.setWatermark(logo('b.png')); useImageStore.getState().resetOps()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:wm2')
    useImageStore.getState().setWatermark(logo('c.png')); useImageStore.getState().setFile(null)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:wm3')
  })
})
