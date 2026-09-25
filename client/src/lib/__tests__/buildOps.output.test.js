import { describe, it, expect, vi } from 'vitest'
import { buildOps } from '../buildOps.js'
import { makeMockImage } from './setup.js'

vi.mock('@imagemagick/magick-wasm', () => {
  const MagickColor    = vi.fn(function(...a) { this._type='MagickColor'; this.args=a })
  const MagickGeometry = vi.fn(function(...a) { this._type='MagickGeometry'; this.args=a })
  const Percentage     = vi.fn(function(v) { this._type='Percentage'; this.value=v })
  const ColorSpace     = { Undefined: 'Undefined' }
  const Gravity        = { Northwest: 'NW', Center: 'C', Undefined: 'Undef' }
  const Interlace      = { Jpeg: 'Jpeg' }
  const PixelInterpolateMethod = { Undefined: 'Undefined' }
  const AlphaAction    = { Remove: 'Remove' }
  const DitherMethod   = { No: 'No', FloydSteinberg: 'FloydSteinberg' }
  const QuantizeSettings = vi.fn(function() { this.colors = 256; this.ditherMethod = 'Riemersma' })
  return { MagickColor, MagickGeometry, Percentage, ColorSpace, Gravity, Interlace, PixelInterpolateMethod, AlphaAction, DitherMethod, QuantizeSettings }
})

function run(ops, output, imageOpts) {
  const img = makeMockImage(imageOpts)
  buildOps(img, ops, output)
  return img
}

describe('buildOps – output flags', () => {
  it('sets quality from output', () => {
    const img = run({}, { format: 'jpeg', quality: 70, strip: false, interlace: false, losslessWebp: false })
    expect(img.quality).toBe(70)
  })

  it('does not set quality for png', () => {
    const img = run({}, { format: 'png', quality: 30, strip: false, interlace: false, losslessWebp: false })
    expect(img.quality).toBe(85)
  })

  it('calls strip when output.strip is true', () => {
    const img = run({}, { format: 'jpeg', quality: 85, strip: true, interlace: false, losslessWebp: false })
    expect(img.strip).toHaveBeenCalledOnce()
  })

  it('does not call strip when output.strip is false', () => {
    const img = run({}, { format: 'jpeg', quality: 85, strip: false, interlace: false, losslessWebp: false })
    expect(img.strip).not.toHaveBeenCalled()
  })

  it('sets interlace for jpeg format', () => {
    const img = run({}, { format: 'jpeg', quality: 85, strip: false, interlace: true, losslessWebp: false })
    expect(img.interlace).toBe('Jpeg')
  })

  it('does not set interlace for non-jpeg format', () => {
    const img = run({}, { format: 'png', quality: 85, strip: false, interlace: true, losslessWebp: false })
    expect(img.interlace).toBeNull()
  })

  it('sets lossless webp artifact for webp format', () => {
    const img = run({}, { format: 'webp', quality: 85, strip: false, interlace: false, losslessWebp: true })
    expect(img.settings.setDefine).toHaveBeenCalledWith('webp:lossless', 'true')
  })

  it('does not set lossless artifact for non-webp format', () => {
    const img = run({}, { format: 'jpeg', quality: 85, strip: false, interlace: false, losslessWebp: true })
    expect(img.settings.setDefine).not.toHaveBeenCalled()
  })

  it('applies border with color', () => {
    const img = run({ border: { width: 5, color: '#ffffff' } }, { format: 'jpeg', quality: 85, strip: false, interlace: false, losslessWebp: false })
    expect(img.border).toHaveBeenCalledWith(5)
    expect(img.borderColor).not.toBeNull()
  })

  it('annotates text with correct settings', () => {
    const img = run(
      { annotate: { text: 'Hello', gravity: 'NorthWest', size: 24, color: '#ff0000', opacity: 80, x: 5, y: 5, rotation: 0 } },
      { format: 'jpeg', quality: 85, strip: false, interlace: false, losslessWebp: false }
    )
    expect(img.settings.fontPointsize).toBe(24)
    expect(img.settings.font).toBe('NotoSans')
    expect(img.annotate).toHaveBeenCalledOnce()
    const [text, geometry, gravity] = img.annotate.mock.calls[0]
    expect(text).toBe('Hello')
    expect(geometry.args).toEqual([5, 5, 800, 600])
    expect(gravity).toBe('NW')
  })

  it('skips annotate when text is empty', () => {
    const img = run(
      { annotate: { text: '', gravity: 'NorthWest', size: 24, color: '#ff0000', opacity: 80 } },
      { format: 'jpeg', quality: 85, strip: false, interlace: false, losslessWebp: false }
    )
    expect(img.annotate).not.toHaveBeenCalled()
  })
})

describe('buildOps – output formats', () => {
  const out = extra => ({ format: 'jpeg', quality: 85, strip: false, interlace: false, losslessWebp: false, ...extra })

  it('sets quality for jxl and pdf', () => {
    expect(run({}, out({ format: 'jxl', quality: 60 })).quality).toBe(60)
    expect(run({}, out({ format: 'pdf', quality: 60 })).quality).toBe(60)
  })

  it('does not set quality for bmp or ico', () => {
    expect(run({}, out({ format: 'bmp', quality: 30 })).quality).toBe(85)
    expect(run({}, out({ format: 'ico', quality: 30 })).quality).toBe(85)
  })

  it('sets jpeg:extent only for jpeg with a size limit', () => {
    expect(run({}, out({ jpegMaxKb: 150 })).settings.setDefine).toHaveBeenCalledWith('jpeg:extent', '150kb')
    expect(run({}, out({ format: 'webp', jpegMaxKb: 150 })).settings.setDefine).not.toHaveBeenCalled()
    expect(run({}, out({ jpegMaxKb: null })).settings.setDefine).not.toHaveBeenCalled()
  })

  it('quantizes png and gif with the chosen colours and dither', () => {
    const img = run({}, out({ format: 'png', colors: 16, dither: false }))
    const [settings] = img.quantize.mock.calls[0]
    expect(settings.colors).toBe(16)
    expect(settings.ditherMethod).toBe('No')
    const gif = run({}, out({ format: 'gif', colors: 8, dither: true }))
    expect(gif.quantize.mock.calls[0][0].ditherMethod).toBe('FloydSteinberg')
  })

  it('does not quantize jpeg or when colours is off', () => {
    expect(run({}, out({ colors: 16 })).quantize).not.toHaveBeenCalled()
    expect(run({}, out({ format: 'png', colors: null })).quantize).not.toHaveBeenCalled()
  })

  it('flattens alpha for jpeg but not for png', () => {
    const jpg = run({}, out({ flattenBg: '#00ff00' }), { hasAlpha: true })
    expect(jpg.alpha).toHaveBeenCalledWith('Remove')
    expect(jpg.backgroundColor.args).toEqual([0, 255, 0, 255])
    const png = run({}, out({ format: 'png' }), { hasAlpha: true })
    expect(png.alpha).not.toHaveBeenCalled()
  })

  it('pads a non-square image to a square for ico and caps the sizes', () => {
    const img = run({}, out({ format: 'ico' }), { width: 40, height: 20 })
    expect(img.extent).toHaveBeenCalledWith(40, 40, 'C')
    expect(img.settings.setDefine).toHaveBeenCalledWith('icon:auto-resize', '32,16')
  })

  it('asks for all icon sizes for a large square image', () => {
    const img = run({}, out({ format: 'ico' }), { width: 1000, height: 1000 })
    expect(img.extent).not.toHaveBeenCalled()
    expect(img.settings.setDefine).toHaveBeenCalledWith('icon:auto-resize', '256,48,32,16')
  })
})
