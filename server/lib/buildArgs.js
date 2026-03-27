import { execFile } from 'child_process'

function identifyDimensions(inputPath) {
  return new Promise((resolve, reject) => {
    execFile('magick', ['identify', '-format', '%w %h', inputPath],
      { timeout: 15_000 },
      (err, stdout) => {
        if (err) return reject(err)
        const [w, h] = stdout.trim().split(' ').map(Number)
        resolve([w, h])
      }
    )
  })
}

/**
 * Builds the ImageMagick args array for a given ops + output config.
 * Caller: spawn('magick', await buildArgs(ops, inPath, outPath, output))
 *
 * Pipeline order:
 *  1. Auto-orient
 *  2. Crop
 *  3. Resize
 *  4. Geometry (rotate/flip/flop/trim)
 *  5. Color/Tone
 *  6. Blur/Sharpen
 *  7. Effects
 *  8. Border
 *  9. Annotate
 * 10. Output
 */
export async function buildArgs(ops, inputPath, outputPath, output) {
  const args = [inputPath]

  if (ops.autoOrient) args.push('-auto-orient')

  if (ops.crop) {
    const [imgW, imgH] = await identifyDimensions(inputPath)
    const cropW = Math.max(1, Math.round(ops.crop.width  * imgW))
    const cropH = Math.max(1, Math.round(ops.crop.height * imgH))
    const cropX = Math.round(ops.crop.x * imgW)
    const cropY = Math.round(ops.crop.y * imgH)
    args.push('-crop', `${cropW}x${cropH}+${cropX}+${cropY}`, '+repage')
  }

  const rw = ops.resizeWidth
  const rh = ops.resizeHeight
  const mode = ops.resizeMode ?? 'fit'
  if (rw || rh) {
    switch (mode) {
      case 'fit':
        args.push('-resize', `${rw || ''}x${rh || ''}`)
        break
      case 'fill':
        args.push('-resize', `${rw}x${rh}^`, '-gravity', ops.gravity ?? 'Center', '-extent', `${rw}x${rh}`)
        break
      case 'exact':
        args.push('-resize', `${rw}x${rh}!`)
        break
      case 'percent':
        args.push('-resize', `${rw}%`)
        break
    }
  }


  const rotate = ops.rotate ?? 0
  if (rotate !== 0) {
    args.push('-background', ops.rotateBg ?? 'none', '-rotate', String(rotate))
  }
  if (ops.flip)  args.push('-flip')
  if (ops.flop)  args.push('-flop')
  if (ops.trim)  args.push('-trim', '+repage')


  if (ops.brightnessContrast) {
    const b = ops.brightnessContrastB ?? 0
    const c = ops.brightnessContrastC ?? 0
    args.push('-brightness-contrast', `${b}x${c}`)
  }
  if (ops.modulate) {
    const br = ops.modulateBrightness ?? 100
    const sa = ops.modulateSaturation ?? 100
    const hu = ops.modulateHue        ?? 100
    args.push('-modulate', `${br},${sa},${hu}`)
  }
  if (ops.gamma !== undefined && ops.gamma !== 1.0) {
    args.push('-gamma', String(ops.gamma))
  }
  if (ops.levelBlack !== undefined || ops.levelWhite !== undefined) {
    const bl = ops.levelBlack ?? 0
    const wh = ops.levelWhite ?? 100
    const lg = ops.levelGamma ?? 1.0
    args.push('-level', `${bl}%,${wh}%,${lg}`)
  }
  if (ops.grayscale)    args.push('-grayscale', 'Rec709Luma')
  if (ops.negate)       args.push('-negate')
  if (ops.normalize)    args.push('-normalize')
  if (ops.equalize)     args.push('-equalize')
  if (ops.whiteBalance) args.push('-white-balance')
  if (ops.sepiaTone) {
    args.push('-sepia-tone', `${ops.sepiaTone ?? 80}%`)
  }
  if (ops.colorspace) {
    args.push('-colorspace', ops.colorspace)
  }


  if (ops.gaussianBlur) {
    args.push('-gaussian-blur', `0x${ops.gaussianBlurSigma ?? 2}`)
  }
  if (ops.sharpen) {
    args.push('-sharpen', `0x${ops.sharpenSigma ?? 1}`)
  }
  if (ops.unsharp) {
    const r = ops.unsharpRadius    ?? 0
    const s = ops.unsharpSigma     ?? 1
    const a = ops.unsharpAmount    ?? 1
    const t = ops.unsharpThreshold ?? 0.05
    args.push('-unsharp', `${r}x${s}+${a}+${t}`)
  }
  if (ops.median) {
    args.push('-median', String(ops.medianRadius ?? 3))
  }
  if (ops.despeckle) args.push('-despeckle')
  if (ops.waveletDenoise !== undefined) {
    args.push('-wavelet-denoise', `${ops.waveletDenoise ?? 5}%`)
  }


  if (ops.charcoal) args.push('-charcoal', String(ops.charcoalRadius ?? 2))
  if (ops.emboss)   args.push('-emboss',   `0x${ops.embossSigma ?? 1}`)
  if (ops.edge)     args.push('-edge',     String(ops.edgeRadius ?? 1))
  if (ops.sketch) {
    args.push('-sketch', `0x${ops.sketchSigma ?? 5}+${ops.sketchAngle ?? 45}`)
  }
  if (ops.spread)  args.push('-spread',  String(ops.spreadRadius ?? 5))
  if (ops.swirl)   args.push('-swirl',   String(ops.swirlAngle ?? 90))
  if (ops.wave)    args.push('-wave',    `${ops.waveAmplitude ?? 25}x${ops.waveWavelength ?? 150}`)
  if (ops.implode) args.push('-implode', String(ops.implodeFactor ?? 0.5))
  if (ops.posterize) args.push('-posterize', String(ops.posterizeLevels ?? 4))
  if (ops.solarize)  args.push('-solarize',  `${ops.solarizeThreshold ?? 50}%`)
  if (ops.paint)     args.push('-paint',     String(ops.paintRadius ?? 3))
  if (ops.vignette) {
    args.push('-background', 'black', '-vignette', `0x${ops.vignetteSigma ?? 10}`)
  }


  if (ops.border) {
    const bw = ops.borderWidth ?? 10
    const bc = ops.borderColor ?? '#000000'
    args.push('-bordercolor', bc, '-border', `${bw}x${bw}`)
  }


  if (ops.annotate && ops.annotateText) {
    const gravity  = ops.gravity       ?? 'NorthWest'
    const size     = ops.annotateSize  ?? 36
    const opacity  = ops.annotateOpacity ?? 100
    const rotation = ops.annotateRotation ?? 0
    const x        = ops.annotateX    ?? 10
    const y        = ops.annotateY    ?? 10
    const hex      = ops.annotateColor ?? '#ffffff'

    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const a = (opacity / 100).toFixed(2)

    args.push(
      '-gravity',   gravity,
      '-font',      'DejaVu-Sans',
      '-pointsize', String(size),
      '-fill',      `rgba(${r},${g},${b},${a})`,
      '-annotate',  `${rotation}x${rotation}+${x}+${y}`,
      ops.annotateText
    )
  }


  if (output.strip) args.push('-strip')
  if (output.interlace && output.format === 'jpeg') args.push('-interlace', 'JPEG')
  if (output.losslessWebp && output.format === 'webp') {
    args.push('-define', 'webp:lossless=true')
  }
  args.push('-quality', String(output.quality ?? 85))
  args.push(outputPath)

  return args
}
