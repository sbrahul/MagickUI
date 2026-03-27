// Numeric ranges: [min, max, default]
const RANGES = {
  // Transform
  resizeWidth:         [1, 16000, null],
  resizeHeight:        [1, 16000, null],
  rotate:              [-360, 360, 0],
  // Color
  brightnessContrastB: [-100, 100, 0],
  brightnessContrastC: [-100, 100, 0],
  modulateBrightness:  [0, 200, 100],
  modulateSaturation:  [0, 200, 100],
  modulateHue:         [0, 200, 100],
  gamma:               [0.1, 10, 1.0],
  levelBlack:          [0, 99, 0],
  levelWhite:          [1, 100, 100],
  levelGamma:          [0.1, 10, 1.0],
  sepiaTone:           [0, 100, 80],
  // Blur/Sharpen
  gaussianBlurSigma:   [0.1, 50, 2],
  sharpenSigma:        [0.1, 20, 1],
  unsharpRadius:       [0, 20, 0],
  unsharpSigma:        [0.1, 20, 1],
  unsharpAmount:       [0, 5, 1],
  unsharpThreshold:    [0, 1, 0.05],
  medianRadius:        [1, 20, 3],
  waveletDenoise:      [0, 30, 5],
  // Effects
  charcoalRadius:      [0, 10, 2],
  embossSigma:         [0.1, 10, 1],
  edgeRadius:          [0, 10, 1],
  sketchSigma:         [0.1, 20, 5],
  sketchAngle:         [-360, 360, 45],
  spreadRadius:        [1, 50, 5],
  swirlAngle:          [-360, 360, 90],
  waveAmplitude:       [1, 200, 25],
  waveWavelength:      [1, 500, 150],
  implodeFactor:       [-3, 3, 0.5],
  posterizeLevels:     [2, 8, 4],
  solarizeThreshold:   [0, 100, 50],
  paintRadius:         [0, 10, 3],
  vignetteSigma:       [0.1, 50, 10],
  // Border
  borderWidth:         [1, 500, 10],
  // Annotate
  annotateSize:        [6, 500, 36],
  annotateOpacity:     [0, 100, 100],
  annotateX:           [-10000, 10000, 10],
  annotateY:           [-10000, 10000, 10],
  annotateRotation:    [-360, 360, 0],
  // Output
  quality:             [1, 100, 85],
  // Crop (ratios 0.0–1.0)
  cropX:               [0, 1, 0],
  cropY:               [0, 1, 0],
  cropWidth:           [0, 1, 1],
  cropHeight:          [0, 1, 1],
}

const GRAVITY_VALUES    = ['NorthWest','North','NorthEast','West','Center','East','SouthWest','South','SouthEast']
const COLORSPACE_VALUES = ['sRGB','Gray','HSL','CMYK','Lab']
const RESIZE_MODES      = ['fit','fill','exact','percent']
const OUTPUT_FORMATS    = ['jpeg','png','webp','avif','tiff','gif']

const COLOR_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/
const TEXT_RE  = /^[\x20-\x7E]{0,500}$/

function err(msg) {
  const e = new Error(msg)
  e.status = 400
  throw e
}

function clampNum(key, val) {
  const [min, max] = RANGES[key]
  const n = Number(val)
  if (!isFinite(n)) err(`${key}: non-finite value`)
  if (n < min || n > max) err(`${key}: ${n} out of range [${min},${max}]`)
  return n
}

function validateColor(key, val) {
  if (!COLOR_RE.test(val)) err(`${key}: invalid hex color`)
  return val
}

/**
 * Validates and cleans the ops object and output options.
 * @param {unknown} ops - raw parsed JSON ops
 * @param {{ format, quality, strip, interlace, losslessWebp }} output
 * @returns {{ ops: object, output: object }}
 * @throws {{ status: 400, message: string }}
 */
export function validate(ops, output) {
  // ops must be a plain object
  if (!ops || typeof ops !== 'object' || Array.isArray(ops)) {
    err('ops must be a plain object')
  }

  // Reject prototype pollution keys
  for (const key of Object.keys(ops)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      err(`Forbidden key: ${key}`)
    }
  }

  const v = {}

  // ── Boolean flags ──────────────────────────────────────────────
  const boolKeys = ['autoOrient','flip','flop','trim','grayscale','negate',
                    'normalize','equalize','whiteBalance','despeckle',
                    'gaussianBlur','sharpen','unsharp','median',
                    'charcoal','emboss','edge','sketch','spread','swirl',
                    'wave','implode','posterize','solarize','paint','vignette',
                    'border','annotate','brightnessContrast','modulate',
                    'sepiaTone','interlace','losslessWebp','strip']
  for (const k of boolKeys) {
    if (k in ops) v[k] = Boolean(ops[k])
  }

  // ── Numeric params ─────────────────────────────────────────────
  for (const key of Object.keys(RANGES)) {
    if (key in ops) v[key] = clampNum(key, ops[key])
  }

  // ── Enum params ────────────────────────────────────────────────
  if ('resizeMode' in ops) {
    if (!RESIZE_MODES.includes(ops.resizeMode)) err(`resizeMode: unknown value "${ops.resizeMode}"`)
    v.resizeMode = ops.resizeMode
  }
  if ('gravity' in ops) {
    if (!GRAVITY_VALUES.includes(ops.gravity)) err(`gravity: unknown value "${ops.gravity}"`)
    v.gravity = ops.gravity
  }
  if ('colorspace' in ops) {
    if (!COLORSPACE_VALUES.includes(ops.colorspace)) err(`colorspace: unknown value "${ops.colorspace}"`)
    v.colorspace = ops.colorspace
  }

  // ── Color params ───────────────────────────────────────────────
  if ('borderColor' in ops) v.borderColor = validateColor('borderColor', ops.borderColor)
  if ('rotateBg'    in ops) v.rotateBg    = validateColor('rotateBg', ops.rotateBg)
  if ('annotateColor' in ops) v.annotateColor = validateColor('annotateColor', ops.annotateColor)

  // ── Free text ──────────────────────────────────────────────────
  if ('annotateText' in ops) {
    if (!TEXT_RE.test(ops.annotateText)) err('annotateText: invalid characters or too long')
    v.annotateText = ops.annotateText
  }

  // ── Crop sub-object ────────────────────────────────────────────
  if (ops.crop && typeof ops.crop === 'object' && !Array.isArray(ops.crop)) {
    v.crop = {
      x:      clampNum('cropX',      ops.crop.x      ?? 0),
      y:      clampNum('cropY',      ops.crop.y      ?? 0),
      width:  clampNum('cropWidth',  ops.crop.width  ?? 1),
      height: clampNum('cropHeight', ops.crop.height ?? 1),
    }
  }

  // ── Output validation ──────────────────────────────────────────
  if (!OUTPUT_FORMATS.includes(output.format)) err(`outputFormat: unknown "${output.format}"`)
  const quality = clampNum('quality', output.quality ?? 85)

  return {
    ops: v,
    output: {
      format:      output.format,
      quality,
      strip:       Boolean(output.strip),
      interlace:   Boolean(output.interlace),
      losslessWebp: Boolean(output.losslessWebp),
    },
  }
}
