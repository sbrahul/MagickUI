import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildOps } from '../buildOps.js'
import { makeMockImage } from './setup.js'

// ── Mock @imagemagick/magick-wasm ────────────────────────────────
// buildOps uses these enums/classes only as values passed through
// to the mock image methods, so simple identity stubs are enough.
vi.mock('@imagemagick/magick-wasm', () => {
  const MagickColor    = vi.fn((...a) => ({ _type: 'MagickColor', args: a }))
  const MagickGeometry = vi.fn((...a) => ({ _type: 'MagickGeometry', args: a }))
  const Percentage     = vi.fn(v => ({ _type: 'Percentage', value: v }))
  const ColorSpace     = { sRGB: 'sRGB', Gray: 'Gray', HSL: 'HSL', CMYK: 'CMYK', Lab: 'Lab', Undefined: 'Undefined' }
  const Gravity        = { NorthWest: 'NW', North: 'N', NorthEast: 'NE', West: 'W', Center: 'C', East: 'E', SouthWest: 'SW', South: 'S', SouthEast: 'SE', Undefined: 'Undef' }
  const Interlace      = { Jpeg: 'Jpeg' }
  const PixelInterpolateMethod = { Undefined: 'Undefined' }
  return { MagickColor, MagickGeometry, Percentage, ColorSpace, Gravity, Interlace, PixelInterpolateMethod }
})

// ── Helpers ──────────────────────────────────────────────────────
const DEFAULT_OUTPUT = { format: 'jpeg', quality: 85, strip: false, interlace: false, losslessWebp: false }

function run(ops, output = DEFAULT_OUTPUT, imgOpts = {}) {
  const img = makeMockImage(imgOpts)
  buildOps(img, ops, output)
  return img
}

// ── Transform tests ──────────────────────────────────────────────
describe('buildOps – transform ops', () => {
  it('calls autoOrient when flag is true', () => {
    const img = run({ autoOrient: true })
    expect(img.autoOrient).toHaveBeenCalledOnce()
  })

  it('does not call autoOrient when flag is false', () => {
    const img = run({ autoOrient: false })
    expect(img.autoOrient).not.toHaveBeenCalled()
  })

  it('crops with normalized coords converted to pixels', () => {
    const img = run(
      { crop: { x: 0.1, y: 0.2, width: 0.5, height: 0.4 } },
      DEFAULT_OUTPUT,
      { width: 1000, height: 500 }
    )
    expect(img.crop).toHaveBeenCalledOnce()
    expect(img.resetPage).toHaveBeenCalled()
    const geom = img.crop.mock.calls[0][0]
    // x=100, y=100, w=500, h=200
    expect(geom.args).toEqual([100, 100, 500, 200])
  })

  it('crops width/height to at least 1 pixel', () => {
    const img = run({ crop: { x: 0, y: 0, width: 0, height: 0 } }, DEFAULT_OUTPUT, { width: 100, height: 100 })
    const geom = img.crop.mock.calls[0][0]
    expect(geom.args[2]).toBe(1) // width >= 1
    expect(geom.args[3]).toBe(1) // height >= 1
  })

  it('rotates with rotateBg background color', () => {
    const img = run({ rotate: 90, rotateBg: '#ff0000' })
    expect(img.rotate).toHaveBeenCalledWith(90)
    expect(img.backgroundColor).not.toBeNull()
  })

  it('does not rotate when angle is 0', () => {
    const img = run({ rotate: 0 })
    expect(img.rotate).not.toHaveBeenCalled()
  })

  it('calls flip and flop independently', () => {
    const img = run({ flip: true, flop: true })
    expect(img.flip).toHaveBeenCalledOnce()
    expect(img.flop).toHaveBeenCalledOnce()
  })

  it('calls trim and resetPage', () => {
    const img = run({ trim: true })
    expect(img.trim).toHaveBeenCalledOnce()
    expect(img.resetPage).toHaveBeenCalled()
  })

  it('resizes in fit mode', () => {
    const img = run({ resize: { width: 400, height: 300, mode: 'fit' } })
    expect(img.resize).toHaveBeenCalledOnce()
    expect(img.extent).not.toHaveBeenCalled()
  })

  it('resizes in fill mode (resize + extent)', () => {
    const img = run({ resize: { width: 400, height: 300, mode: 'fill' } })
    expect(img.resize).toHaveBeenCalledOnce()
    expect(img.extent).toHaveBeenCalledOnce()
  })

  it('resizes in exact mode', () => {
    const img = run({ resize: { width: 400, height: 300, mode: 'exact' } })
    expect(img.resize).toHaveBeenCalledOnce()
    expect(img.extent).not.toHaveBeenCalled()
  })

  it('resizes in percent mode', () => {
    const img = run({ resize: { width: 50, height: 50, mode: 'percent' } })
    expect(img.resize).toHaveBeenCalledOnce()
  })
})
