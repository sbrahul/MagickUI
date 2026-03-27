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

describe('buildOps – effects ops', () => {
  it('applies charcoal', () => {
    const img = run({ charcoal: { radius: 1 } })
    expect(img.charcoal).toHaveBeenCalledWith(1, 1)
  })

  it('applies edge op via cannyEdge (not image.edge)', () => {
    const img = run({ edge: true })
    expect(img.cannyEdge).toHaveBeenCalledOnce()
  })

  it('applies solarize with Percentage threshold', () => {
    const img = run({ solarize: { threshold: 50 } })
    expect(img.solarize).toHaveBeenCalledOnce()
    expect(img.solarize.mock.calls[0][0]).toMatchObject({ value: 50 })
  })

  it('applies paint op via oilPaint (not image.paint)', () => {
    const img = run({ paint: { radius: 3 } })
    expect(img.oilPaint).toHaveBeenCalledWith(3)
  })

  it('applies vignette with sigma', () => {
    const img = run({ vignette: { sigma: 4 } })
    expect(img.vignette).toHaveBeenCalledWith(0, 4, 0, 0)
  })

  it('applies wave with amplitude and wavelength', () => {
    const img = run({ wave: { amplitude: 5, wavelength: 20 } })
    expect(img.wave).toHaveBeenCalledOnce()
    const [method, amp, wl] = img.wave.mock.calls[0]
    expect(amp).toBe(5)
    expect(wl).toBe(20)
  })

  it('skips all effects when falsy', () => {
    const img = run({ charcoal: null, edge: null, solarize: null, paint: null, vignette: null, wave: null })
    expect(img.charcoal).not.toHaveBeenCalled()
    expect(img.cannyEdge).not.toHaveBeenCalled()
    expect(img.solarize).not.toHaveBeenCalled()
    expect(img.oilPaint).not.toHaveBeenCalled()
    expect(img.vignette).not.toHaveBeenCalled()
    expect(img.wave).not.toHaveBeenCalled()
  })
})
