import {
  ColorSpace,
  Gravity,
  Interlace,
  MagickColor,
  MagickGeometry,
  Percentage,
  PixelInterpolateMethod,
} from '@imagemagick/magick-wasm'

const FORMAT_MIME = {
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  tiff: 'image/tiff',
  gif:  'image/gif',
}

export function getMime(format) {
  return FORMAT_MIME[format] ?? 'application/octet-stream'
}

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
    NorthWest: Gravity.NorthWest,
    North:     Gravity.North,
    NorthEast: Gravity.NorthEast,
    West:      Gravity.West,
    Center:    Gravity.Center,
    East:      Gravity.East,
    SouthWest: Gravity.SouthWest,
    South:     Gravity.South,
    SouthEast: Gravity.SouthEast,
  }
  return map[str] ?? Gravity.Undefined
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

export function buildOps(image, ops, output) {
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
        image.resize(new MagickGeometry(`${rw}%`))
        break
    }
  }

  // 4. Geometry
  if (ops.rotate && ops.rotate !== 0) {
    image.backgroundColor = hexToMagickColor(ops.rotateBg ?? '#000000')
    image.rotate(ops.rotate)
  }
  if (ops.flip)  image.flip()
  if (ops.flop)  image.flop()
  if (ops.trim)  { image.trim(); image.resetPage() }

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

  // 8. Border
  if (ops.border) {
    image.borderColor = hexToMagickColor(ops.border.color ?? '#000000')
    image.border(ops.border.width)
  }

  // 9. Annotate
  if (ops.annotate?.text) {
    const { text, gravity, size, color, opacity, x, y, rotation } = ops.annotate
    image.settings.fontPointsize = size ?? 36
    image.settings.fillColor = hexToMagickColor(color ?? '#ffffff', opacity ?? 100)
    image.annotate(
      text,
      new MagickGeometry(x ?? 10, y ?? 10, 0, 0),
      gravityEnum(gravity ?? 'NorthWest'),
      rotation ?? 0,
    )
  }

  // 10. Output flags
  image.quality = output.quality ?? 85
  if (output.strip) image.strip()
  if (output.interlace && output.format === 'jpeg') {
    image.settings.interlace = Interlace.Jpeg
  }
  if (output.losslessWebp && output.format === 'webp') {
    image.setArtifact('webp:lossless', 'true')
  }
}
