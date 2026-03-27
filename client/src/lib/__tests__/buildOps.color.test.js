import { describe, it, expect, vi } from 'vitest'
import { buildOps } from '../buildOps.js'
import { makeMockImage } from './setup.js'

vi.mock('@imagemagick/magick-wasm', () => {
  const MagickColor    = vi.fn((...a) => ({ _type: 'MagickColor', args: a }))
  const MagickGeometry = vi.fn((...a) => ({ _type: 'MagickGeometry', args: a }))
  const Percentage     = vi.fn(v => ({ _type: 'Percentage', value: v }))
  const ColorSpace     = { sRGB: 'sRGB', Gray: 'Gray', HSL: 'HSL', CMYK: 'CMYK', Lab: 'Lab', Undefined: 'Undefined' }
  const Gravity        = { Center: 'C', NorthWest: 'NW', Undefined: 'Undef' }
  const Interlace      = { Jpeg: 'Jpeg' }
  const PixelInterpolateMethod = { Undefined: 'Undefined' }
  return { MagickColor, MagickGeometry, Percentage, ColorSpace, Gravity, Interlace, PixelInterpolateMethod }
})

const DEFAULT_OUTPUT = { format: 'jpeg', quality: 85, strip: false, interlace: false, losslessWebp: false }
function run(ops, output = DEFAULT_OUTPUT) {
  const img = makeMockImage()
  buildOps(img, ops, output)
  return img
}

describe('buildOps – color ops', () => {
  it('applies brightnessContrast with Percentage wrappers', () => {
    const img = run({ brightnessContrast: { b: 10, c: -5 } })
    expect(img.brightnessContrast).toHaveBeenCalledOnce()
    const [b, c] = img.brightnessContrast.mock.calls[0]
    expect(b).toMatchObject({ value: 10 })
    expect(c).toMatchObject({ value: -5 })
  })

  it('applies modulate with Percentage wrappers', () => {
    const img = run({ modulate: { brightness: 110, saturation: 90, hue: 100 } })
    expect(img.modulate).toHaveBeenCalledOnce()
  })

  it('applies gamma correction', () => {
    const img = run({ gamma: 1.5 })
    expect(img.gammaCorrect).toHaveBeenCalledWith(1.5)
  })

  it('skips gamma when null', () => {
    const img = run({ gamma: null })
    expect(img.gammaCorrect).not.toHaveBeenCalled()
  })

  it('applies level', () => {
    const img = run({ level: { black: 5, white: 95, gamma: 1.0 } })
    expect(img.level).toHaveBeenCalledOnce()
  })

  it('applies grayscale', () => {
    const img = run({ grayscale: true })
    expect(img.grayscale).toHaveBeenCalledOnce()
  })

  it('applies negate', () => {
    const img = run({ negate: true })
    expect(img.negate).toHaveBeenCalledOnce()
  })

  it('applies normalize', () => {
    const img = run({ normalize: true })
    expect(img.normalize).toHaveBeenCalledOnce()
  })

  it('applies autoLevel (new op)', () => {
    const img = run({ autoLevel: true })
    expect(img.autoLevel).toHaveBeenCalledOnce()
  })

  it('applies autoGamma (new op)', () => {
    const img = run({ autoGamma: true })
    expect(img.autoGamma).toHaveBeenCalledOnce()
  })

  it('skips autoLevel when false', () => {
    const img = run({ autoLevel: false })
    expect(img.autoLevel).not.toHaveBeenCalled()
  })

  it('skips autoGamma when false', () => {
    const img = run({ autoGamma: false })
    expect(img.autoGamma).not.toHaveBeenCalled()
  })

  it('applies sepiaTone with Percentage wrapper', () => {
    const img = run({ sepiaTone: 80 })
    expect(img.sepiaTone).toHaveBeenCalledOnce()
    expect(img.sepiaTone.mock.calls[0][0]).toMatchObject({ value: 80 })
  })

  it('skips sepiaTone when null', () => {
    const img = run({ sepiaTone: null })
    expect(img.sepiaTone).not.toHaveBeenCalled()
  })

  it('sets colorSpace enum for known value', () => {
    const img = run({ colorspace: 'Gray' })
    expect(img.colorSpace).toBe('Gray')
  })

  it('sets colorSpace to Undefined for unknown value', () => {
    const img = run({ colorspace: 'Unknown' })
    expect(img.colorSpace).toBe('Undefined')
  })
})
