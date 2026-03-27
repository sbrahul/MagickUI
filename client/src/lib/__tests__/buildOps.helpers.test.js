import { describe, it, expect, vi } from 'vitest'
import { getMime, hexToMagickColor, gravityEnum, colorspaceEnum } from '../buildOps.js'

vi.mock('@imagemagick/magick-wasm', () => {
  const MagickColor = vi.fn((r, g, b, a) => ({ r, g, b, a }))
  const ColorSpace  = { sRGB: 'sRGB', Gray: 'Gray', HSL: 'HSL', CMYK: 'CMYK', Lab: 'Lab', Undefined: 'Undefined' }
  const Gravity     = { NorthWest: 'NW', North: 'N', NorthEast: 'NE', West: 'W', Center: 'C', East: 'E', SouthWest: 'SW', South: 'S', SouthEast: 'SE', Undefined: 'Undef' }
  const MagickGeometry     = vi.fn()
  const Percentage         = vi.fn()
  const Interlace          = { Jpeg: 'Jpeg' }
  const PixelInterpolateMethod = { Undefined: 'Undefined' }
  return { MagickColor, MagickGeometry, Percentage, ColorSpace, Gravity, Interlace, PixelInterpolateMethod }
})

describe('getMime', () => {
  it.each([
    ['jpeg', 'image/jpeg'],
    ['png',  'image/png'],
    ['webp', 'image/webp'],
    ['avif', 'image/avif'],
    ['tiff', 'image/tiff'],
    ['gif',  'image/gif'],
  ])('returns correct MIME for %s', (format, mime) => {
    expect(getMime(format)).toBe(mime)
  })

  it('returns application/octet-stream for unknown format', () => {
    expect(getMime('bmp')).toBe('application/octet-stream')
  })
})

describe('hexToMagickColor', () => {
  it('converts #ff0000 to r=255 g=0 b=0 a=255', () => {
    const c = hexToMagickColor('#ff0000')
    expect(c).toMatchObject({ r: 255, g: 0, b: 0, a: 255 })
  })

  it('converts #ffffff to full white', () => {
    const c = hexToMagickColor('#ffffff')
    expect(c).toMatchObject({ r: 255, g: 255, b: 255, a: 255 })
  })

  it('respects opacity percentage', () => {
    const c = hexToMagickColor('#000000', 50)
    // 50% of 255 = 127 (rounded)
    expect(c.a).toBe(128)
  })

  it('handles hex without # prefix', () => {
    const c = hexToMagickColor('00ff00')
    expect(c).toMatchObject({ r: 0, g: 255, b: 0 })
  })
})

describe('gravityEnum', () => {
  it.each([
    ['NorthWest', 'NW'],
    ['North',     'N'],
    ['NorthEast', 'NE'],
    ['West',      'W'],
    ['Center',    'C'],
    ['East',      'E'],
    ['SouthWest', 'SW'],
    ['South',     'S'],
    ['SouthEast', 'SE'],
  ])('maps %s to enum %s', (input, expected) => {
    expect(gravityEnum(input)).toBe(expected)
  })

  it('returns Undefined for unknown value', () => {
    expect(gravityEnum('Top')).toBe('Undef')
  })
})

describe('colorspaceEnum', () => {
  it.each([
    ['sRGB', 'sRGB'],
    ['Gray', 'Gray'],
    ['HSL',  'HSL'],
    ['CMYK', 'CMYK'],
    ['Lab',  'Lab'],
  ])('maps %s correctly', (input, expected) => {
    expect(colorspaceEnum(input)).toBe(expected)
  })

  it('returns Undefined for unknown colorspace', () => {
    expect(colorspaceEnum('XYZ')).toBe('Undefined')
  })
})
