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
  // File state
  originalFile: null,
  originalBlobUrl: null,
  processedBlobUrl: null,
  processedMeta: null,
  isProcessing: false,
  abortController: null,
  errorDetail: null,

  // App state
  capabilities: null,
  showOriginal: true,

  // Operations
  ops: { ...DEFAULT_OPS },
  output: { ...DEFAULT_OUTPUT },

  // ── Actions ──────────────────────────────────────────────────

  setFile(file) {
    const prev = get().originalBlobUrl
    if (prev) URL.revokeObjectURL(prev)
    const prevP = get().processedBlobUrl
    if (prevP) URL.revokeObjectURL(prevP)
    set({
      originalFile: file,
      originalBlobUrl: file ? URL.createObjectURL(file) : null,
      processedBlobUrl: null,
      processedMeta: null,
      showOriginal: true,
      errorDetail: null,
      ops: { ...DEFAULT_OPS },
    })
  },

  setCapabilities(caps) { set({ capabilities: caps }) },

  updateOp(key, value) {
    set(state => ({ ops: { ...state.ops, [key]: value } }))
  },

  updateOutput(key, value) {
    set(state => ({ output: { ...state.output, [key]: value } }))
  },

  resetOps() {
    set({
      ops: { ...DEFAULT_OPS },
      showOriginal: true,
    })
  },

  setProcessing(isProcessing, abortController = null) {
    set({ isProcessing, abortController })
  },

  setProcessed(blobUrl, meta) {
    const prev = get().processedBlobUrl
    if (prev) URL.revokeObjectURL(prev)
    set({ processedBlobUrl: blobUrl, processedMeta: meta, showOriginal: false, errorDetail: null })
  },

  setError(errorDetail) {
    set({ errorDetail, isProcessing: false, abortController: null })
  },

  togglePreview() {
    set(state => ({
      showOriginal: state.processedBlobUrl ? !state.showOriginal : true,
    }))
  },
}))
