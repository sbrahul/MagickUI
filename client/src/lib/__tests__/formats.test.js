import { describe, it, expect } from 'vitest'
import { OUTPUT_FORMATS, getMime, extFor, isDisplayable, usesQuality, dropsAlpha, buildAcceptMap, readHint, readsLargestFrame } from '../formats.js'

describe('formats – output', () => {
  it('gives every output format a mime type and an extension', () => {
    for (const f of OUTPUT_FORMATS) {
      expect(f.mime).toMatch(/^[a-z]+\/[\w.+-]+$/)
      expect(f.ext).toMatch(/^\w+$/)
    }
  })

  it('uses jpg as the JPEG download extension', () => {
    expect(extFor('jpeg')).toBe('jpg')
  })

  it('marks TIFF as not displayable and PNG as displayable', () => {
    expect(isDisplayable('tiff')).toBe(false)
    expect(isDisplayable('png')).toBe(true)
  })

  it('uses quality for lossy formats only', () => {
    expect(usesQuality('jpeg')).toBe(true)
    expect(usesQuality('webp')).toBe(true)
    expect(usesQuality('png')).toBe(false)
    expect(usesQuality('gif')).toBe(false)
  })

  it('falls back for an unknown format', () => {
    expect(getMime('nope')).toBe('application/octet-stream')
    expect(isDisplayable('nope')).toBe(false)
  })
})

describe('formats – dropsAlpha', () => {
  it('is true for jpeg and mp4, false for png', () => {
    expect(dropsAlpha({ format: 'jpeg' })).toBe(true)
    expect(dropsAlpha({ format: 'mp4' })).toBe(true)
    expect(dropsAlpha({ format: 'png' })).toBe(false)
  })

  it('is true for pdf below quality 100 only', () => {
    expect(dropsAlpha({ format: 'pdf', quality: 80 })).toBe(true)
    expect(dropsAlpha({ format: 'pdf', quality: 100 })).toBe(false)
  })
})

describe('formats – input', () => {
  it('builds an accept map of mime keys to dotted extensions', () => {
    const map = buildAcceptMap()
    for (const [mime, exts] of Object.entries(map)) {
      expect(mime).not.toBe('application/octet-stream')
      expect(mime).not.toBe('image/*')
      for (const e of exts) expect(e).toMatch(/^\.[a-z0-9]+$/)
    }
    expect(map['image/vnd.adobe.photoshop']).toContain('.psd')
    expect(map['image/x-icon']).toEqual(['.ico', '.cur'])
  })

  it('gives read hints only for formats without a signature', () => {
    expect(readHint('logo.TGA')).toBe('TGA')
    expect(readHint('favicon.ico')).toBe('ICO')
    expect(readHint('pointer.cur')).toBe('CUR')
    expect(readHint('photo.jpg')).toBeUndefined()
    expect(readHint('noextension')).toBeUndefined()
    expect(readHint(undefined)).toBeUndefined()
  })

  it('reads the largest frame of icons only', () => {
    expect(readsLargestFrame('a.ico')).toBe(true)
    expect(readsLargestFrame('a.CUR')).toBe(true)
    expect(readsLargestFrame('a.psd')).toBe(false)
  })
})
