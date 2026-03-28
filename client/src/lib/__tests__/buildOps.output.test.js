import { describe, it, expect, vi } from 'vitest'
import { buildOps } from '../buildOps.js'
import { makeMockImage } from './setup.js'

vi.mock('@imagemagick/magick-wasm', () => {
  const MagickColor    = vi.fn(function(...a) { this._type='MagickColor'; this.args=a })
  const MagickGeometry = vi.fn(function(...a) { this._type='MagickGeometry'; this.args=a })
  const Percentage     = vi.fn(function(v) { this._type='Percentage'; this.value=v })
  const ColorSpace     = { Undefined: 'Undefined' }
  const Gravity        = { NorthWest: 'NW', Undefined: 'Undef' }
  const Interlace      = { Jpeg: 'Jpeg' }
  const PixelInterpolateMethod = { Undefined: 'Undefined' }
  return { MagickColor, MagickGeometry, Percentage, ColorSpace, Gravity, Interlace, PixelInterpolateMethod }
})

function run(ops, output) {
  const img = makeMockImage()
  buildOps(img, ops, output)
  return img
}

describe('buildOps – output flags', () => {
  it('sets quality from output', () => {
    const img = run({}, { format: 'jpeg', quality: 70, strip: false, interlace: false, losslessWebp: false })
    expect(img.quality).toBe(70)
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
    expect(img.setArtifact).toHaveBeenCalledWith('webp:lossless', 'true')
  })

  it('does not set lossless artifact for non-webp format', () => {
    const img = run({}, { format: 'jpeg', quality: 85, strip: false, interlace: false, losslessWebp: true })
    expect(img.setArtifact).not.toHaveBeenCalled()
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
    expect(img.annotate).toHaveBeenCalledOnce()
    const [text] = img.annotate.mock.calls[0]
    expect(text).toBe('Hello')
  })

  it('skips annotate when text is empty', () => {
    const img = run(
      { annotate: { text: '', gravity: 'NorthWest', size: 24, color: '#ff0000', opacity: 80 } },
      { format: 'jpeg', quality: 85, strip: false, interlace: false, losslessWebp: false }
    )
    expect(img.annotate).not.toHaveBeenCalled()
  })
})
