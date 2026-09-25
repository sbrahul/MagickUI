import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({ image: null, IM: null }))

vi.mock('@imagemagick/magick-wasm', () => ({
  MagickFormat: { Jpeg: 'JPEG', Png: 'PNG', WebP: 'WEBP', Avif: 'AVIF', Tiff: 'TIFF', Gif: 'GIF', Jxl: 'JXL', Bmp: 'BMP', Ico: 'ICO', Pdf: 'PDF' },
  CompressionMethod: { Zip: 'Zip' },
}))
vi.mock('../../lib/buildOps.js', () => ({ buildOps: vi.fn() }))
vi.mock('../../lib/gifToMp4.js', () => ({ gifToMp4: vi.fn() }))
vi.mock('../../lib/wasm.js', () => ({
  getIM: async () => state.IM,
  loadFont: vi.fn(async () => {}),
  readLogo: async ops => (ops.watermark?.file ? new Uint8Array([9]) : null),
  withImage: (IM, bytes, fn) => (bytes ? IM.read(bytes, fn) : fn(null)),
}))

import { processImage, decodeForDisplay } from '../client.js'

function makeImage({ hasAlpha = false, width = 100, height = 50 } = {}) {
  return {
    hasAlpha,
    width,
    height,
    quality: 85,
    write: vi.fn((fmt, cb) => cb(new Uint8Array([1, 2, 3]))),
    setCompression: vi.fn(),
  }
}

beforeEach(() => {
  state.image = makeImage()
  state.IM = { read: vi.fn((bytes, ...rest) => rest.at(-1)(state.image)) }
  let n = 0
  URL.createObjectURL = vi.fn(() => `blob:${++n}`)
})

const file = new Blob([new Uint8Array([0])], { type: 'image/png' })

describe('processImage – preview copy', () => {
  it('writes once and returns no preview for a displayable format', async () => {
    const r = await processImage({ file, ops: {}, output: { format: 'jpeg' } })
    expect(state.image.write).toHaveBeenCalledTimes(1)
    expect(r.previewUrl).toBeNull()
    expect(r.meta).toEqual({ format: 'jpeg', sizeBytes: 3 })
  })

  it('writes a JPEG preview for TIFF output', async () => {
    const r = await processImage({ file, ops: {}, output: { format: 'tiff' } })
    expect(state.image.write.mock.calls.map(c => c[0])).toEqual(['TIFF', 'JPEG'])
    expect(r.previewUrl).toBe('blob:2')
  })

  it('writes a PNG preview when the image has alpha', async () => {
    state.image = makeImage({ hasAlpha: true })
    await processImage({ file, ops: {}, output: { format: 'tiff' } })
    expect(state.image.write.mock.calls.map(c => c[0])).toEqual(['TIFF', 'PNG'])
  })
})

describe('processImage – PDF', () => {
  it('uses Zip compression at quality 100', async () => {
    await processImage({ file, ops: {}, output: { format: 'pdf', quality: 100 } })
    expect(state.image.setCompression).toHaveBeenCalledWith('Zip')
    expect(state.image.write.mock.calls[0][0]).toBe('PDF')
    expect(state.IM.read).toHaveBeenCalledTimes(1)
  })

  it('writes a JPEG and re-reads it before writing the PDF below quality 100', async () => {
    const decoded = makeImage()
    state.IM.read = vi.fn()
      .mockImplementationOnce((bytes, cb) => cb(state.image))
      .mockImplementationOnce((bytes, cb) => cb(decoded))
    const r = await processImage({ file, ops: {}, output: { format: 'pdf', quality: 80 } })
    expect(state.image.write.mock.calls[0][0]).toBe('JPEG')
    expect(state.IM.read.mock.calls[1][0]).toEqual(new Uint8Array([1, 2, 3]))
    expect(decoded.write.mock.calls[0][0]).toBe('PDF')
    expect(r.previewUrl).not.toBeNull()
  })
})

describe('reading inputs', () => {
  const named = name => new File([new Uint8Array([0])], name)

  it('passes the TGA hint to IM.read', async () => {
    await processImage({ file: named('logo.tga'), ops: {}, output: { format: 'png' } })
    expect(state.IM.read.mock.calls[0][1]).toBe('TGA')
  })

  it('reads icons as a collection and uses the largest frame', async () => {
    const small = makeImage({ width: 16, height: 16 })
    const big = makeImage({ width: 256, height: 256 })
    state.IM.readCollection = vi.fn((bytes, hint, cb) => cb([small, big]))
    await processImage({ file: named('favicon.ico'), ops: {}, output: { format: 'png' } })
    expect(state.IM.readCollection.mock.calls[0][1]).toBe('ICO')
    expect(big.write).toHaveBeenCalled()
    expect(small.write).not.toHaveBeenCalled()
  })

  it('decodeForDisplay returns the size and a displayable URL', async () => {
    const r = await decodeForDisplay(named('scan.tiff'))
    expect(r).toEqual({ width: 100, height: 50, blobUrl: 'blob:1' })
    expect(state.image.write.mock.calls[0][0]).toBe('JPEG')
  })

  it('reports wasm out-of-memory errors in plain words', async () => {
    state.IM.read = vi.fn(() => { throw new RangeError('memory access out of bounds') })
    await expect(processImage({ file: named('huge.png'), ops: {}, output: { format: 'png' } }))
      .rejects.toMatchObject({ message: 'The image is too large to process in the browser.' })
  })
})

describe('processImage – watermark', () => {
  it('reads the logo first and passes it to buildOps', async () => {
    const { buildOps } = await import('../../lib/buildOps.js')
    const logo = makeImage({ width: 10, height: 10 })
    state.IM.read = vi.fn()
      .mockImplementationOnce((bytes, cb) => cb(logo))
      .mockImplementationOnce((bytes, cb) => cb(state.image))
    const ops = { watermark: { file: new Blob([new Uint8Array([9])]) } }
    await processImage({ file, ops, output: { format: 'png' } })
    expect(state.IM.read.mock.calls[0][0]).toEqual(new Uint8Array([9]))
    expect(buildOps).toHaveBeenLastCalledWith(state.image, ops, { format: 'png' }, { watermark: logo })
  })
})

describe('processImage – animated GIF to GIF', () => {
  it('applies the ops to every frame with one shared context and writes all frames', async () => {
    const { buildOps } = await import('../../lib/buildOps.js')
    buildOps.mockClear()
    const frames = [makeImage(), makeImage(), makeImage()]
    frames.coalesce = vi.fn()
    frames.write = vi.fn((fmt, cb) => cb(new Uint8Array([7, 7])))
    state.IM.readCollection = vi.fn((bytes, cb) => cb(frames))
    const gif = new File([new Uint8Array([0])], 'anim.gif', { type: 'image/gif' })
    const r = await processImage({ file: gif, ops: {}, output: { format: 'gif' } })
    expect(frames.coalesce).toHaveBeenCalled()
    expect(buildOps).toHaveBeenCalledTimes(3)
    const ctxs = buildOps.mock.calls.map(c => c[3])
    expect(ctxs[0]).toBe(ctxs[2])
    expect(ctxs[0].animation).toEqual({})
    expect(frames.write.mock.calls[0][0]).toBe('GIF')
    expect(r.meta).toEqual({ format: 'gif', sizeBytes: 2 })
  })

  it('uses the single-image path for a PNG written as GIF', async () => {
    state.IM.readCollection = vi.fn()
    await processImage({ file: new File([new Uint8Array([0])], 'a.png', { type: 'image/png' }), ops: {}, output: { format: 'gif' } })
    expect(state.IM.readCollection).not.toHaveBeenCalled()
  })
})
