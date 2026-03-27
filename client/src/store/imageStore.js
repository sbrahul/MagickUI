import { create } from 'zustand'

const DEFAULT_OPS = {
  autoOrient: false,
  crop: null,
  resize: null,
  rotate: 0,
  rotateBg: '#000000',
  flip: false,
  flop: false,
  trim: false,
  brightnessContrast: null,
  modulate: null,
  gamma: null,
  level: null,
  grayscale: false,
  negate: false,
  normalize: false,
  equalize: false,
  whiteBalance: false,
  sepiaTone: null,
  colorspace: null,
  gaussianBlur: null,
  sharpen: null,
  unsharp: null,
  median: null,
  despeckle: false,
  waveletDenoise: null,
  charcoal: null,
  emboss: null,
  edge: null,
  sketch: null,
  spread: null,
  swirl: null,
  wave: null,
  implode: null,
  posterize: null,
  solarize: null,
  paint: null,
  vignette: null,
  border: null,
  annotate: null,
}

const DEFAULT_OUTPUT = {
  format: 'jpeg',
  quality: 85,
  strip: false,
  interlace: false,
  losslessWebp: false,
}

export const useImageStore = create((set, get) => ({
  originalFile: null,
  originalBlobUrl: null,
  originalDimensions: null,
  processedBlobUrl: null,
  processedMeta: null,
  isProcessing: false,
  abortController: null,
  errorDetail: null,

  // Live preview (temporary, cleared when Apply is pressed)
  livePreviewUrl: null,
  isLivePreviewing: false,
  livePreviewEnabled: false,

  capabilities: null,
  showOriginal: true,

  ops: { ...DEFAULT_OPS },
  output: { ...DEFAULT_OUTPUT },


  setFile(file) {
    const prev = get().originalBlobUrl
    if (prev) URL.revokeObjectURL(prev)
    const prevP = get().processedBlobUrl
    if (prevP) URL.revokeObjectURL(prevP)
    const blobUrl = file ? URL.createObjectURL(file) : null
    const prevLive = get().livePreviewUrl
    if (prevLive) URL.revokeObjectURL(prevLive)
    set({
      originalFile: file,
      originalBlobUrl: blobUrl,
      originalDimensions: null,
      processedBlobUrl: null,
      processedMeta: null,
      livePreviewUrl: null,
      isLivePreviewing: false,
      showOriginal: true,
      errorDetail: null,
      ops: { ...DEFAULT_OPS },
    })
    if (blobUrl) {
      const img = new Image()
      img.onload = () => {
        useImageStore.setState({ originalDimensions: { width: img.naturalWidth, height: img.naturalHeight } })
      }
      img.src = blobUrl
    }
  },

  setCapabilities(caps) { set({ capabilities: caps }) },

  updateOp(key, value) {
    set(state => ({ ops: { ...state.ops, [key]: value } }))
  },

  updateOutput(key, value) {
    set(state => ({ output: { ...state.output, [key]: value } }))
  },

  resetOps() {
    const prevLive = get().livePreviewUrl
    if (prevLive) URL.revokeObjectURL(prevLive)
    set({
      ops: { ...DEFAULT_OPS },
      livePreviewUrl: null,
      isLivePreviewing: false,
      showOriginal: true,
    })
  },

  setLivePreview(blobUrl) {
    const prev = get().livePreviewUrl
    if (prev) URL.revokeObjectURL(prev)
    set({ livePreviewUrl: blobUrl, isLivePreviewing: blobUrl !== null })
  },

  toggleLivePreview() {
    const next = !get().livePreviewEnabled
    if (!next) {
      const prev = get().livePreviewUrl
      if (prev) URL.revokeObjectURL(prev)
      set({ livePreviewEnabled: false, livePreviewUrl: null, isLivePreviewing: false })
    } else {
      set({ livePreviewEnabled: true })
    }
  },

  setProcessing(isProcessing, abortController = null) {
    set({ isProcessing, abortController })
  },

  setProcessed(blobUrl, meta) {
    const prev = get().processedBlobUrl
    if (prev) URL.revokeObjectURL(prev)
    const prevLive = get().livePreviewUrl
    if (prevLive) URL.revokeObjectURL(prevLive)
    set({ processedBlobUrl: blobUrl, processedMeta: meta, livePreviewUrl: null, isLivePreviewing: false, showOriginal: false, errorDetail: null })
  },

  setError(errorDetail) {
    set({ errorDetail, isProcessing: false, abortController: null })
  },

  togglePreview() {
    set(state => ({
      showOriginal: state.processedBlobUrl ? !state.showOriginal : true,
    }))
  },

  cleanup() {
    const { originalBlobUrl, processedBlobUrl, livePreviewUrl } = get()
    if (originalBlobUrl) URL.revokeObjectURL(originalBlobUrl)
    if (processedBlobUrl) URL.revokeObjectURL(processedBlobUrl)
    if (livePreviewUrl) URL.revokeObjectURL(livePreviewUrl)
    set({ originalBlobUrl: null, processedBlobUrl: null, livePreviewUrl: null })
  },
}))
