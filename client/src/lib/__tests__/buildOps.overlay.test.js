import { describe, it, expect, vi } from 'vitest'
import { buildOps, needsAlpha } from '../buildOps.js'
import { makeMockImage } from './setup.js'

vi.mock('@imagemagick/magick-wasm', () => {
  const MagickColor    = vi.fn(function(...a) { this._type = 'MagickColor'; this.args = a })
  const MagickGeometry = vi.fn(function(...a) { this._type = 'MagickGeometry'; this.args = a })
  const Percentage     = vi.fn(function(v) { this._type = 'Percentage'; this.value = v })
  const Point          = vi.fn(function(x, y) { this.x = x; this.y = y })
  const QuantizeSettings = vi.fn(function() { this.colors = 256; this.ditherMethod = 'Riemersma' })
  return {
    MagickColor, MagickGeometry, Percentage, Point, QuantizeSettings,
    ColorSpace: { Undefined: 'Undefined' },
    Gravity: { Northwest: 'NW', Southeast: 'SE', Center: 'C', Undefined: 'Undef' },
    Interlace: { Jpeg: 'Jpeg' },
    PixelInterpolateMethod: { Undefined: 'Undefined' },
    AlphaAction: { Set: 'Set', Remove: 'Remove' },
    AutoThresholdMethod: { OTSU: 'OTSU', Kapur: 'Kapur', Triangle: 'Triangle' },
    Channels: { Undefined: 'AllChannels', Alpha: 'Alpha' },
    EvaluateOperator: { Multiply: 'Multiply' },
    CompositeOperator: { Over: 'Over', DstOver: 'DstOver' },
    DitherMethod: { No: 'No', FloydSteinberg: 'FloydSteinberg' },
    NoiseType: { Gaussian: 'Gaussian', Uniform: 'Uniform' },
  }
})

const PNG = { format: 'png', quality: 85 }
const run = (ops, output = PNG, ctx) => {
  const img = makeMockImage()
  buildOps(img, ops, output, ctx)
  return img
}
const order = (a, b) => a.mock.invocationCallOrder[0] < b.mock.invocationCallOrder[0]

describe('buildOps – new ops', () => {
  it('applies CLAHE with the tile size on both axes', () => {
    const img = run({ clahe: { tile: 12, clip: 3 } })
    const [x, y, bins, clip] = img.clahe.mock.calls[0]
    expect([x.value, y.value, bins, clip]).toEqual([12, 12, 128, 3])
  })

  it('deskews with the rotate background before rotating', () => {
    const img = run({ deskew: { threshold: 40, autoCrop: true }, rotate: 90, rotateBg: '#ffffff' })
    expect(img.deskew.mock.calls[0][0].value).toBe(40)
    expect(img.deskew.mock.calls[0][1]).toBe(true)
    expect(img.resetPage).toHaveBeenCalled()
    expect(order(img.deskew, img.rotate)).toBe(true)
  })

  it('measures the deskew angle once for all frames of an animation', () => {
    const ctx = { animation: {} }
    const ops = { deskew: { threshold: 40, autoCrop: true } }
    const first = makeMockImage()
    first.clone = vi.fn(fn => fn({ deskew: () => -4.5 }))
    buildOps(first, ops, PNG, ctx)
    const second = run(ops, PNG, ctx)
    expect(first.clone).toHaveBeenCalledOnce()
    expect(second.clone).not.toHaveBeenCalled()
    expect(first.rotate).toHaveBeenCalledWith(-4.5)
    expect(second.rotate).toHaveBeenCalledWith(-4.5)
    expect(first.deskew).not.toHaveBeenCalled()
  })

  it('makes a colour transparent before colour ops', () => {
    const img = run({ transparent: { color: '#ffffff', fuzz: 15 }, brightnessContrast: { b: 10, c: 0 } })
    expect(img.colorFuzz.value).toBe(15)
    expect(img.transparent.mock.calls[0][0].args).toEqual([255, 255, 255, 255])
    expect(order(img.transparent, img.brightnessContrast)).toBe(true)
  })

  it('passes attenuate and channels to addNoise', () => {
    const img = run({ grain: { type: 'Uniform', amount: 0.8 } })
    expect(img.addNoise).toHaveBeenCalledWith('Uniform', 0.8, 'AllChannels')
  })

  it('converts to grayscale before a manual threshold', () => {
    const img = run({ threshold: { mode: 'manual', value: 60, method: 'OTSU' } })
    expect(order(img.grayscale, img.threshold)).toBe(true)
    expect(img.threshold.mock.calls[0][0].value).toBe(60)
    expect(img.autoThreshold).not.toHaveBeenCalled()
  })

  it('uses the chosen method for an auto threshold', () => {
    const img = run({ threshold: { mode: 'auto', value: 50, method: 'Kapur' } })
    expect(img.autoThreshold).toHaveBeenCalledWith('Kapur')
    expect(img.threshold).not.toHaveBeenCalled()
  })

  it('posterizes with dithering off by default', () => {
    const img = run({ quantize: { colors: 6, dither: false } })
    const [s] = img.quantize.mock.calls[0]
    expect(s.colors).toBe(6)
    expect(s.ditherMethod).toBe('No')
  })

  it('draws the shadow under the image on a larger transparent canvas', () => {
    const img = makeMockImage({ width: 300, height: 200 })
    img.clone = vi.fn(fn => fn({
      shadow: vi.fn(), page: { x: -2, y: -2 }, width: 324, height: 224,
    }))
    buildOps(img, { shadow: { x: 10, y: 10, sigma: 6, opacity: 60, color: '#000000' } }, PNG)
    expect(img.alpha).toHaveBeenCalledWith('Set')
    expect(img.backgroundColor.args).toEqual([0, 0, 0, 0])
    expect(img.extent.mock.calls[0][0].args).toEqual([-2, -2, 324, 224])
    const [, op, point] = img.composite.mock.calls[0]
    expect(op).toBe('DstOver')
    expect([point.x, point.y]).toEqual([0, 0])
  })

  it('flattens the shadow for jpeg output', () => {
    const img = makeMockImage({ width: 300, height: 200, hasAlpha: true })
    buildOps(img, {}, { format: 'jpeg', quality: 85, flattenBg: '#ffffff' })
    expect(img.alpha).toHaveBeenCalledWith('Remove')
  })
})

describe('buildOps – image watermark', () => {
  const wm = extra => ({ watermark: { gravity: 'SouthEast', scale: 20, opacity: 50, x: 2, y: 3, ...extra } })

  it('does nothing without a loaded logo', () => {
    const img = run(wm())
    expect(img.compositeGravity).not.toHaveBeenCalled()
  })

  it('sizes, fades and places a clone of the logo', () => {
    const logo = makeMockImage({ width: 100, height: 50 })
    const img = run({ ...wm(), border: { width: 5, color: '#000000' } }, PNG, { watermark: logo })
    const clone = logo.clones[0]
    expect(clone.resize.mock.calls[0][0].args).toEqual(['160x'])
    expect(clone.alpha).toHaveBeenCalledWith('Set')
    expect(clone.evaluate).toHaveBeenCalledWith('Alpha', 'Multiply', 0.5)
    const [placed, gravity, op, point] = img.compositeGravity.mock.calls[0]
    expect(placed).toBe(clone)
    expect([gravity, op, point.x, point.y]).toEqual(['SE', 'Over', 16, 24])
    expect(order(img.compositeGravity, img.border)).toBe(true)
    expect(logo.resize).not.toHaveBeenCalled()
  })

  it('skips the alpha change at full opacity', () => {
    const logo = makeMockImage()
    run(wm({ opacity: 100 }), PNG, { watermark: logo })
    expect(logo.clones[0].evaluate).not.toHaveBeenCalled()
  })
})

describe('needsAlpha', () => {
  it('is true only for ops that add transparency', () => {
    expect(needsAlpha({})).toBe(false)
    expect(needsAlpha({ clahe: { tile: 12, clip: 3 } })).toBe(false)
    expect(needsAlpha({ transparent: { color: '#fff', fuzz: 10 } })).toBe(true)
    expect(needsAlpha({ shadow: {} })).toBe(true)
  })
})
