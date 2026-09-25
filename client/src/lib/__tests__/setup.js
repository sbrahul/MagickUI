/**
 * Creates a mock MagickImage-like object where every method is a vi.fn().
 * Tests import this and pass it to buildOps() instead of a real wasm image.
 */
export function makeMockImage({ width = 800, height = 600, hasAlpha = false } = {}) {
  const img = {
    width,
    height,
    quality: 85,
    interlace: null,
    backgroundColor: null,
    borderColor: null,
    colorSpace: null,
    hasAlpha,
    colorFuzz: null,
    page: { x: 0, y: 0 },
    clones: [],
    settings: {
      fontPointsize: null,
      fillColor: null,
      setDefine: vi.fn(),
    },
    alpha:           vi.fn(),
    autoOrient:      vi.fn(),
    autoLevel:       vi.fn(),
    autoGamma:       vi.fn(),
    adaptiveSharpen: vi.fn(),
    addNoise:        vi.fn(),
    annotate:        vi.fn(),
    autoThreshold:   vi.fn(),
    clahe:           vi.fn(),
    composite:       vi.fn(),
    compositeGravity: vi.fn(),
    deskew:          vi.fn(() => 0),
    evaluate:        vi.fn(),
    shadow:          vi.fn(),
    threshold:       vi.fn(),
    transparent:     vi.fn(),
    bilateralBlur:   vi.fn(),
    border:          vi.fn(),
    brightnessContrast: vi.fn(),
    cannyEdge:       vi.fn(),
    charcoal:        vi.fn(),
    colorize:        vi.fn(),
    crop:            vi.fn(),
    extent:          vi.fn(),
    flip:            vi.fn(),
    flop:            vi.fn(),
    gammaCorrect:    vi.fn(),
    gaussianBlur:    vi.fn(),
    grayscale:       vi.fn(),
    level:           vi.fn(),
    modulate:        vi.fn(),
    motionBlur:      vi.fn(),
    negate:          vi.fn(),
    normalize:       vi.fn(),
    oilPaint:        vi.fn(),
    quantize:        vi.fn(),
    resetPage:       vi.fn(),
    resize:          vi.fn(),
    rotate:          vi.fn(),
    sepiaTone:       vi.fn(),
    setArtifact:     vi.fn(),
    sharpen:         vi.fn(),
    solarize:        vi.fn(),
    strip:           vi.fn(),
    trim:            vi.fn(),
    vignette:        vi.fn(),
    wave:            vi.fn(),
  }
  img.clone = vi.fn(fn => {
    const c = makeMockImage({ width, height, hasAlpha })
    img.clones.push(c)
    return fn(c)
  })
  return img
}
