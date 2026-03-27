/**
 * Returns a human-readable magick command string for display only.
 * Mirrors the server-side buildArgs pipeline order.
 */
export function buildCommand(ops, output, inputExt = 'jpg') {
  const parts = [`magick input.${inputExt}`]

  if (ops.autoOrient) parts.push('-auto-orient')

  if (ops.crop) {
    const { x, y, width, height } = ops.crop
    parts.push(`-crop ${(width*100).toFixed(0)}%x${(height*100).toFixed(0)}%+${(x*100).toFixed(0)}%+${(y*100).toFixed(0)}% +repage`)
  }

  if (ops.resize) {
    const { width, height, mode } = ops.resize
    const modeFlag = { fit: '', fill: '^', exact: '!', percent: '%' }[mode] ?? ''
    if (mode === 'percent') parts.push(`-resize ${width}%`)
    else parts.push(`-resize ${width ?? ''}x${height ?? ''}${modeFlag}`)
  }

  if (ops.rotate !== 0) parts.push(`-rotate ${ops.rotate}`)
  if (ops.flip) parts.push('-flip')
  if (ops.flop) parts.push('-flop')
  if (ops.trim) parts.push('-trim +repage')

  if (ops.brightnessContrast) parts.push(`-brightness-contrast ${ops.brightnessContrast.b}x${ops.brightnessContrast.c}`)
  if (ops.modulate) parts.push(`-modulate ${ops.modulate.brightness},${ops.modulate.saturation},${ops.modulate.hue}`)
  if (ops.gamma !== null && ops.gamma !== undefined) parts.push(`-gamma ${ops.gamma}`)
  if (ops.level) parts.push(`-level ${ops.level.black}%,${ops.level.white}%,${ops.level.gamma}`)
  if (ops.grayscale) parts.push('-grayscale Rec709Luma')
  if (ops.negate) parts.push('-negate')
  if (ops.normalize) parts.push('-normalize')
  if (ops.equalize) parts.push('-equalize')
  if (ops.whiteBalance) parts.push('-white-balance')
  if (ops.sepiaTone !== null && ops.sepiaTone !== undefined) parts.push(`-sepia-tone ${ops.sepiaTone}%`)
  if (ops.colorspace) parts.push(`-colorspace ${ops.colorspace}`)

  if (ops.gaussianBlur) parts.push(`-gaussian-blur 0x${ops.gaussianBlur.sigma}`)
  if (ops.sharpen) parts.push(`-sharpen 0x${ops.sharpen.sigma}`)
  if (ops.unsharp) {
    const { radius: r, sigma: s, amount: a, threshold: t } = ops.unsharp
    parts.push(`-unsharp ${r}x${s}+${a}+${t}`)
  }
  if (ops.median) parts.push(`-median ${ops.median.radius}`)
  if (ops.despeckle) parts.push('-despeckle')
  if (ops.waveletDenoise) parts.push(`-wavelet-denoise ${ops.waveletDenoise.threshold}%`)

  if (ops.charcoal) parts.push(`-charcoal ${ops.charcoal.radius}`)
  if (ops.emboss) parts.push(`-emboss 0x${ops.emboss.sigma}`)
  if (ops.edge) parts.push(`-edge ${ops.edge.radius}`)
  if (ops.sketch) parts.push(`-sketch 0x${ops.sketch.sigma}+${ops.sketch.angle}`)
  if (ops.spread) parts.push(`-spread ${ops.spread.radius}`)
  if (ops.swirl) parts.push(`-swirl ${ops.swirl.angle}`)
  if (ops.wave) parts.push(`-wave ${ops.wave.amplitude}x${ops.wave.wavelength}`)
  if (ops.implode) parts.push(`-implode ${ops.implode.factor}`)
  if (ops.posterize) parts.push(`-posterize ${ops.posterize.levels}`)
  if (ops.solarize) parts.push(`-solarize ${ops.solarize.threshold}%`)
  if (ops.paint) parts.push(`-paint ${ops.paint.radius}`)
  if (ops.vignette) parts.push(`-background black -vignette 0x${ops.vignette.sigma}`)

  if (ops.border) parts.push(`-bordercolor "${ops.border.color}" -border ${ops.border.width}x${ops.border.width}`)

  if (ops.annotate) {
    const { text, gravity, size, color, opacity, x, y, rotation } = ops.annotate
    const alpha = ((opacity ?? 100) / 100).toFixed(2)
    parts.push(`-gravity ${gravity} -font DejaVu-Sans -pointsize ${size} -fill "rgba(0,0,0,${alpha})" -annotate ${rotation}x${rotation}+${x}+${y} "${text}"`)
  }

  if (output.strip) parts.push('-strip')
  if (output.interlace && output.format === 'jpeg') parts.push('-interlace JPEG')
  if (output.losslessWebp && output.format === 'webp') parts.push('-define webp:lossless=true')
  if (['jpeg', 'webp', 'avif'].includes(output.format)) parts.push(`-quality ${output.quality}`)

  parts.push(`output.${output.format}`)
  return parts.join(' ')
}
