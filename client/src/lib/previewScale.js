const MAX_PX = 800

// JPEG would turn transparent areas black before any op runs.
const MAY_HAVE_ALPHA = ['image/png', 'image/webp', 'image/gif', 'image/avif', 'image/tiff', 'image/heic', 'image/heif']

// Returns a File containing a downscaled version of the input (WebP when the source
// may have transparency, else JPEG), capped to MAX_PX on the longest side. Uses Canvas
// so it runs entirely on the main thread without WASM overhead.
// Returns null on failure so callers fall back to the original.
export async function makePreviewFile(blobOrFile) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(blobOrFile)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { naturalWidth: w, naturalHeight: h } = img
      const scale = Math.min(1, MAX_PX / Math.max(w, h))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      const type = MAY_HAVE_ALPHA.includes(blobOrFile.type) ? 'image/webp' : 'image/jpeg'
      canvas.toBlob(blob => {
        if (!blob) { resolve(null); return }
        // Browsers without a WebP encoder return PNG.
        const ext = blob.type.split('/')[1]
        resolve(new File([blob], `preview.${ext}`, { type: blob.type }))
      }, type, 0.82)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}
