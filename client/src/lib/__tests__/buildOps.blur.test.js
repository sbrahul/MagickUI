import { describe, it, expect, vi } from 'vitest'
import { buildOps } from '../buildOps.js'
import { makeMockImage } from './setup.js'

vi.mock('@imagemagick/magick-wasm', () => {
  const MagickColor    = vi.fn((...a) => ({ _type: 'MagickColor', args: a }))
  const MagickGeometry = vi.fn((...a) => ({ _type: 'MagickGeometry', args: a }))
  const Percentage     = vi.fn(v => ({ _type: 'Percentage', value: v }))
  const ColorSpace     = { Undefined: 'Undefined' }
  const Gravity        = { NorthWest: 'NW', Undefined: 'Undef' }
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

describe('buildOps – blur / sharpen ops', () => {
  it('applies gaussianBlur with sigma', () => {
    const img = run({ gaussianBlur: { sigma: 2 } })
    expect(img.gaussianBlur).toHaveBeenCalledWith(0, 2)
  })

  it('applies bilateralBlur (new op) with width/height', () => {
    const img = run({ bilateralBlur: { width: 5, height: 5 } })
    expect(img.bilateralBlur).toHaveBeenCalledWith(5, 5)
  })

  it('applies motionBlur (new op) with radius/sigma/angle', () => {
    const img = run({ motionBlur: { radius: 0, sigma: 5, angle: 45 } })
    expect(img.motionBlur).toHaveBeenCalledWith(0, 5, 45)
  })

  it('applies sharpen with sigma', () => {
    const img = run({ sharpen: { sigma: 1.5 } })
    expect(img.sharpen).toHaveBeenCalledWith(0, 1.5)
  })

  it('applies adaptiveSharpen (new op) with sigma', () => {
    const img = run({ adaptiveSharpen: { sigma: 2 } })
    expect(img.adaptiveSharpen).toHaveBeenCalledWith(0, 2)
  })

  it('skips all blur ops when null', () => {
    const img = run({ gaussianBlur: null, bilateralBlur: null, motionBlur: null, sharpen: null, adaptiveSharpen: null })
    expect(img.gaussianBlur).not.toHaveBeenCalled()
    expect(img.bilateralBlur).not.toHaveBeenCalled()
    expect(img.motionBlur).not.toHaveBeenCalled()
    expect(img.sharpen).not.toHaveBeenCalled()
    expect(img.adaptiveSharpen).not.toHaveBeenCalled()
  })
})
