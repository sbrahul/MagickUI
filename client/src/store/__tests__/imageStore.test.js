import { describe, it, expect, beforeEach } from 'vitest'
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
    livePreviewEnabled: false,
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
