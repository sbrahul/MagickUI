import {
  AlphaAction,
  AutoThresholdMethod,
  Channels,
  ColorSpace,
  CompositeOperator,
  DitherMethod,
  EvaluateOperator,
  Gravity,
  Interlace,
  MagickColor,
  MagickGeometry,
  NoiseType,
  Percentage,
  PixelInterpolateMethod,
  Point,
  QuantizeSettings,
} from '@imagemagick/magick-wasm'
import { dropsAlpha, usesQuality } from './formats.js'

export { getMime } from './formats.js'

export const FONT_NAME = 'NotoSans'

const ICO_SIZES = [256, 48, 32, 16]

export function hexToMagickColor(hex, opacityPct = 100) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const a = Math.round((opacityPct / 100) * 255)
  return new MagickColor(r, g, b, a)
}

export function gravityEnum(str) {
  const map = {
    NorthWest: Gravity.Northwest,
    North:     Gravity.North,
    NorthEast: Gravity.Northeast,
    West:      Gravity.West,
    Center:    Gravity.Center,
    East:      Gravity.East,
    SouthWest: Gravity.Southwest,
    South:     Gravity.South,
    SouthEast: Gravity.Southeast,
  }
  return map[str] ?? Gravity.Undefined
}

// Ops that add transparency, so the live preview must keep alpha to show them.
export function needsAlpha(ops) {
  return !!(ops.transparent || ops.shadow)
}

export function noiseTypeEnum(str) {
  return NoiseType[str] ?? NoiseType.Gaussian
}

export function autoThresholdEnum(str) {
  return AutoThresholdMethod[str] ?? AutoThresholdMethod.OTSU
}

export function colorspaceEnum(str) {
  const map = {
    sRGB: ColorSpace.sRGB,
    Gray: ColorSpace.Gray,
    HSL:  ColorSpace.HSL,
    CMYK: ColorSpace.CMYK,
    Lab:  ColorSpace.Lab,
  }
  return map[str] ?? ColorSpace.Undefined
}

// ctx.animation is shared by all frames of one GIF so per-frame ops stay consistent.
export function buildOps(image, ops, output, ctx = {}) {
  // 1. Auto-orient (EXIF)
  if (ops.autoOrient) image.autoOrient()

  // 2. Crop (normalized 0..1 → pixels)
  if (ops.crop) {
    const x = Math.round(ops.crop.x      * image.width)
    const y = Math.round(ops.crop.y      * image.height)
    const w = Math.max(1, Math.round(ops.crop.width  * image.width))
    const h = Math.max(1, Math.round(ops.crop.height * image.height))
    image.crop(new MagickGeometry(x, y, w, h))
    image.resetPage()
  }

  // 3. Resize
  if (ops.resize) {
    const { width: rw, height: rh, mode } = ops.resize
    switch (mode) {
      case 'fit':
        image.resize(new MagickGeometry(`${rw || ''}x${rh || ''}`))
        break
      case 'fill':
        image.resize(new MagickGeometry(`${rw}x${rh}^`))
        image.extent(rw, rh, gravityEnum(ops.gravity ?? 'Center'))
        break
      case 'exact':
        image.resize(new MagickGeometry(`${rw}x${rh}!`))
        break
      case 'percent':
        image.resize(new MagickGeometry(`${rw}%x${rh}%`))
        break
    }
  }

  // 4. Geometry
  if (ops.deskew) {
    image.backgroundColor = hexToMagickColor(ops.rotateBg ?? '#000000')
    const threshold = new Percentage(ops.deskew.threshold)
    if (ctx.animation) {
      // One angle for every frame, measured on the first, so the animation does not jitter.
      ctx.animation.deskewAngle ??= image.clone(c => c.deskew(threshold))
      image.rotate(ctx.animation.deskewAngle)
    } else {
      image.deskew(threshold, !!ops.deskew.autoCrop)
    }
    image.resetPage()
  }
  if (ops.rotate && ops.rotate !== 0) {
    image.backgroundColor = hexToMagickColor(ops.rotateBg ?? '#000000')
    image.rotate(ops.rotate)
  }
  if (ops.flip)  image.flip()
  if (ops.flop)  image.flop()
  if (ops.trim)  { image.trim(); image.resetPage() }
  // Before colour ops, so the picked colour matches the original image.
  if (ops.transparent) {
    image.colorFuzz = new Percentage(ops.transparent.fuzz)
    image.transparent(hexToMagickColor(ops.transparent.color))
  }

  // 5. Color / Tone
  if (ops.brightnessContrast) {
    image.brightnessContrast(
      new Percentage(ops.brightnessContrast.b),
      new Percentage(ops.brightnessContrast.c),
    )
  }
  if (ops.modulate) {
    image.modulate(
      new Percentage(ops.modulate.brightness),
      new Percentage(ops.modulate.saturation),
      new Percentage(ops.modulate.hue),
    )
  }
  if (ops.gamma !== null && ops.gamma !== undefined) {
    image.gammaCorrect(ops.gamma)
  }
  if (ops.level) {
    image.level(
      new Percentage(ops.level.black),
      new Percentage(ops.level.white),
      ops.level.gamma,
    )
  }
  if (ops.grayscale)  image.grayscale()
  if (ops.negate)     image.negate()
  if (ops.normalize)  image.normalize()
  if (ops.autoLevel)  image.autoLevel()
  if (ops.autoGamma)  image.autoGamma()
  if (ops.clahe) {
    image.clahe(new Percentage(ops.clahe.tile), new Percentage(ops.clahe.tile), 128, ops.clahe.clip)
  }
  if (ops.sepiaTone !== null && ops.sepiaTone !== undefined) {
    image.sepiaTone(new Percentage(ops.sepiaTone))
  }
  if (ops.colorspace) {
    image.colorSpace = colorspaceEnum(ops.colorspace)
  }

  // 6. Blur / Sharpen
  if (ops.gaussianBlur) {
    image.gaussianBlur(0, ops.gaussianBlur.sigma)
  }
  if (ops.bilateralBlur) {
    image.bilateralBlur(ops.bilateralBlur.width, ops.bilateralBlur.height)
  }
  if (ops.motionBlur) {
    image.motionBlur(ops.motionBlur.radius, ops.motionBlur.sigma, ops.motionBlur.angle)
  }
  if (ops.sharpen) {
    image.sharpen(0, ops.sharpen.sigma)
  }
  if (ops.adaptiveSharpen) {
    image.adaptiveSharpen(0, ops.adaptiveSharpen.sigma)
  }

  // 7. Effects
  if (ops.charcoal) {
    image.charcoal(ops.charcoal.radius, 1)
  }
  if (ops.edge) {
    image.cannyEdge()
  }
  if (ops.solarize) {
    image.solarize(new Percentage(ops.solarize.threshold))
  }
  if (ops.paint) {
    image.oilPaint(ops.paint.radius)
  }
  if (ops.vignette) {
    image.vignette(0, ops.vignette.sigma, 0, 0)
  }
  if (ops.wave) {
    image.wave(PixelInterpolateMethod.Undefined, ops.wave.amplitude, ops.wave.wavelength)
  }
  if (ops.grain) {
    // The two-argument addNoise overload drops attenuate in magick-wasm 0.0.43.
    image.addNoise(noiseTypeEnum(ops.grain.type), ops.grain.amount, Channels.Undefined)
  }

  // 7b. Colour reduction, after effects so the result keeps its promise (pure B&W, N colours)
  if (ops.threshold) {
    // Without grayscale, threshold works per channel and gives 8 colours.
    image.grayscale()
    if (ops.threshold.mode === 'auto') image.autoThreshold(autoThresholdEnum(ops.threshold.method))
    else image.threshold(new Percentage(ops.threshold.value))
  }
  if (ops.quantize) {
    const settings = new QuantizeSettings()
    settings.colors = ops.quantize.colors
    settings.ditherMethod = ops.quantize.dither ? DitherMethod.FloydSteinberg : DitherMethod.No
    image.quantize(settings)
  }

  // 8a. Image watermark, before the border so the border does not change its size or position
  if (ops.watermark && ctx.watermark) addWatermark(image, ctx.watermark, ops.watermark)

  // 8. Border
  if (ops.border) {
    image.borderColor = hexToMagickColor(ops.border.color ?? '#000000')
    image.border(ops.border.width)
  }

  // 9. Annotate
  if (ops.annotate?.text) {
    const { text, gravity, size, color, opacity, x, y, rotation } = ops.annotate
    image.settings.font = FONT_NAME
    image.settings.fontPointsize = size ?? 36
    image.settings.fillColor = hexToMagickColor(color ?? '#ffffff', opacity ?? 100)
    image.annotate(
      text,
      // A 0x0 box makes ImageMagick ignore the offset and clip the text at the top edge.
      new MagickGeometry(x ?? 10, y ?? 10, image.width, image.height),
      gravityEnum(gravity ?? 'NorthWest'),
      rotation ?? 0,
    )
  }

  // 9b. Drop shadow, last so it belongs to the framed and annotated picture
  if (ops.shadow) addShadow(image, ops.shadow)

  // 10. Output flags
  if (image.hasAlpha && dropsAlpha(output)) {
    image.backgroundColor = hexToMagickColor(output.flattenBg ?? '#ffffff')
    image.alpha(AlphaAction.Remove)
  }
  // PNG reads quality as zlib level and filter, so a low JPEG quality would make PNGs larger.
  if (usesQuality(output.format)) image.quality = output.quality ?? 85
  if (output.strip) image.strip()
  if (output.interlace && output.format === 'jpeg') {
    image.interlace = Interlace.Jpeg
  }
  // Coder options must be defines: setArtifact is ignored once image.quality is set.
  if (output.losslessWebp && output.format === 'webp') {
    image.settings.setDefine('webp:lossless', 'true')
  }
  if (output.jpegMaxKb && output.format === 'jpeg') {
    image.settings.setDefine('jpeg:extent', `${output.jpegMaxKb}kb`)
  }
  if (output.colors && (output.format === 'png' || output.format === 'gif')) {
    const settings = new QuantizeSettings()
    settings.colors = output.colors
    // QuantizeSettings dithers (Riemersma) unless told otherwise.
    settings.ditherMethod = output.dither ? DitherMethod.FloydSteinberg : DitherMethod.No
    image.quantize(settings)
  }
  if (output.format === 'ico') prepareIcon(image)
}

// Scale and offsets are % of the base width, so the downscaled live preview matches.
function addWatermark(image, source, { gravity, scale, opacity, x, y }) {
  const px = pct => Math.round(image.width * pct / 100)
  // A clone, because the same logo is reused for every GIF frame.
  source.clone(logo => {
    logo.resize(new MagickGeometry(`${Math.max(1, px(scale))}x`))
    if (opacity < 100) {
      logo.alpha(AlphaAction.Set)
      logo.evaluate(Channels.Alpha, EvaluateOperator.Multiply, opacity / 100)
    }
    image.compositeGravity(logo, gravityEnum(gravity), CompositeOperator.Over, new Point(px(x), px(y)))
  })
}

// shadow() replaces the image it runs on, so it runs on a clone that is then put underneath.
function addShadow(image, { x, y, sigma, opacity, color }) {
  image.resetPage()
  image.alpha(AlphaAction.Set)
  image.clone(shadow => {
    shadow.shadow(x, y, sigma, new Percentage(opacity), hexToMagickColor(color))
    const sx = shadow.page.x, sy = shadow.page.y
    const left = Math.max(0, -sx), top = Math.max(0, -sy)
    const width  = Math.max(image.width,  sx + shadow.width)  + left
    const height = Math.max(image.height, sy + shadow.height) + top
    image.backgroundColor = new MagickColor(0, 0, 0, 0)
    image.extent(new MagickGeometry(-left, -top, width, height))
    image.composite(shadow, CompositeOperator.DstOver, new Point(left + sx, top + sy))
  })
  image.resetPage()
}

// Pads to a square first so icon:auto-resize does not stretch the image.
function prepareIcon(image) {
  const side = Math.max(image.width, image.height)
  if (image.width !== image.height) {
    image.backgroundColor = new MagickColor(0, 0, 0, 0)
    image.extent(side, side, Gravity.Center)
  }
  const sizes = ICO_SIZES.filter(s => s <= side)
  if (sizes.length) image.settings.setDefine('icon:auto-resize', sizes.join(','))
}
