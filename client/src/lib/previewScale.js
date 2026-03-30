const MAX_PX = 800

// Returns a File containing a JPEG-encoded downscaled version of the input,
// capped to MAX_PX on the longest side. Uses Canvas so it runs entirely on the
// main thread without WASM overhead.
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
      canvas.toBlob(blob => {
        if (!blob) { resolve(null); return }
        resolve(new File([blob], 'preview.jpg', { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.82)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}
