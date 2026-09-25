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
  autoLevel: false,
  autoGamma: false,
  sepiaTone: null,
  colorspace: null,
  gaussianBlur: null,
  bilateralBlur: null,
  motionBlur: null,
  sharpen: null,
  adaptiveSharpen: null,
  charcoal: null,
  edge: null,
  solarize: null,
  paint: null,
  vignette: null,
  wave: null,
  border: null,
  annotate: null,
  deskew: null,
  transparent: null,
  clahe: null,
  grain: null,
  threshold: null,
  quantize: null,     // shown as "Posterize"; the old posterize op was removed with the wasm move
  shadow: null,
  watermark: null,
}

export const WATERMARK_DEFAULTS = { gravity: 'SouthEast', scale: 20, opacity: 70, x: 2, y: 2 }

const DEFAULT_OUTPUT = {
  format: 'jpeg',
  quality: 85,
  strip: false,
  interlace: false,
  losslessWebp: false,
  videoLoops: 1,
  jpegMaxKb: null,     // null = no size limit
  colors: null,        // null = no colour reduction (png, gif)
  dither: true,
  flattenBg: '#ffffff', // fills transparent areas for formats without alpha
}

function revoke(...urls) {
  for (const url of urls) if (url) URL.revokeObjectURL(url)
}

export const useImageStore = create((set, get) => ({
  originalFile: null,
  originalBlobUrl: null,
  originalDimensions: null,
  previewFile: null,        // downscaled File used for live preview only
  processedBlobUrl: null,
  processedPreviewUrl: null, // displayable copy when the output format cannot be shown in <img>
  processedMeta: null,
  isProcessing: false,
  abortController: null,
  errorDetail: null,
  isAnimatedGif: false,
  isDecoding: false,         // wasm is converting an input the browser cannot show

  // Live preview (temporary, cleared when Apply is pressed)
  livePreviewUrl: null,
  isLivePreviewing: false,
  livePreviewEnabled: true,

  showOriginal: true,

  ops: { ...DEFAULT_OPS },
  output: { ...DEFAULT_OUTPUT },


  setFile(file) {
    const { originalBlobUrl, processedBlobUrl, processedPreviewUrl, livePreviewUrl, ops } = get()
    revoke(originalBlobUrl, processedBlobUrl, processedPreviewUrl, livePreviewUrl, ops.watermark?.url)
    const blobUrl = file ? URL.createObjectURL(file) : null
    set({
      originalFile: file,
      originalBlobUrl: blobUrl,
      originalDimensions: null,
      previewFile: null,
      processedBlobUrl: null,
      processedPreviewUrl: null,
      processedMeta: null,
      livePreviewUrl: null,
      isLivePreviewing: false,
      showOriginal: true,
      errorDetail: null,
      isAnimatedGif: false,
      isDecoding: false,
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

  updateOp(key, value) {
    set(state => ({ ops: { ...state.ops, [key]: value } }))
  },

  updateOutput(key, value) {
    set(state => ({ output: { ...state.output, [key]: value } }))
  },

  resetOps() {
    revoke(get().livePreviewUrl, get().ops.watermark?.url)
    set({
      ops: { ...DEFAULT_OPS },
      livePreviewUrl: null,
      isLivePreviewing: false,
      showOriginal: true,
    })
  },

  // Use this, not updateOp('watermark', null), so the logo's blob URL is revoked.
  setWatermark(file) {
    const prev = get().ops.watermark
    revoke(prev?.url)
    const watermark = file
      ? { ...WATERMARK_DEFAULTS, ...prev, file, url: URL.createObjectURL(file) }
      : null
    set(state => ({ ops: { ...state.ops, watermark } }))
  },

  setLivePreview(blobUrl) {
    revoke(get().livePreviewUrl)
    set({ livePreviewUrl: blobUrl, isLivePreviewing: blobUrl !== null })
  },

  toggleLivePreview() {
    const next = !get().livePreviewEnabled
    if (!next) {
      revoke(get().livePreviewUrl)
      set({ livePreviewEnabled: false, livePreviewUrl: null, isLivePreviewing: false })
    } else {
      set({ livePreviewEnabled: true })
    }
  },

  setProcessing(isProcessing, abortController = null) {
    set({ isProcessing, abortController })
  },

  setProcessed({ blobUrl, previewUrl = null, meta }) {
    const { processedBlobUrl, processedPreviewUrl, livePreviewUrl } = get()
    revoke(processedBlobUrl, processedPreviewUrl, livePreviewUrl)
    set({
      processedBlobUrl: blobUrl,
      processedPreviewUrl: previewUrl,
      processedMeta: meta,
      livePreviewUrl: null,
      isLivePreviewing: false,
      showOriginal: false,
      errorDetail: null,
    })
  },

  setPreviewFile(file) {
    set({ previewFile: file })
  },

  setDisplayUrl(blobUrl, dimensions) {
    revoke(get().originalBlobUrl)
    set({ originalBlobUrl: blobUrl, originalDimensions: dimensions ?? get().originalDimensions })
  },

  setDecoding(isDecoding) {
    set({ isDecoding })
  },

  setIsAnimatedGif(val) {
    set({ isAnimatedGif: val })
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
    const { originalBlobUrl, processedBlobUrl, processedPreviewUrl, livePreviewUrl, ops } = get()
    revoke(originalBlobUrl, processedBlobUrl, processedPreviewUrl, livePreviewUrl, ops.watermark?.url)
    set({ originalBlobUrl: null, processedBlobUrl: null, processedPreviewUrl: null, livePreviewUrl: null })
  },
}))
