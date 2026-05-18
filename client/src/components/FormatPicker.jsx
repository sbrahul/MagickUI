import { useImageStore } from '../store/imageStore.js'
import { cn } from '../lib/utils.js'

const FORMATS = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png',  label: 'PNG'  },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'tiff', label: 'TIFF' },
  { value: 'gif',  label: 'GIF'  },
  { value: 'mp4',  label: 'MP4', animatedGifOnly: true },
]

export function FormatPicker() {
  const output         = useImageStore(s => s.output)
  const updateOutput   = useImageStore(s => s.updateOutput)
  const isAnimatedGif  = useImageStore(s => s.isAnimatedGif)

  return (
    <div className="px-4 py-3 border-b border-white/10">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
        Output Format
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {FORMATS.map(f => {
          const disabled = f.animatedGifOnly && !isAnimatedGif
          return (
            <button
              key={f.value}
              onClick={() => !disabled && updateOutput('format', f.value)}
              disabled={disabled}
              title={disabled ? 'Only available for animated GIFs' : undefined}
              className={cn(
                'py-1 rounded text-[11px] font-medium border transition-colors',
                output.format === f.value
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : disabled
                    ? 'border-white/10 text-gray-600 cursor-not-allowed'
                    : 'border-white/20 text-gray-400 dark:hover:text-white hover:text-gray-900 hover:border-gray-400',
              )}
            >
              {f.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
