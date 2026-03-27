import { useImageStore } from '../store/imageStore.js'
import { cn } from '../lib/utils.js'

const FORMATS = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png',  label: 'PNG'  },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'tiff', label: 'TIFF' },
  { value: 'gif',  label: 'GIF'  },
]

export function FormatPicker() {
  const output       = useImageStore(s => s.output)
  const updateOutput = useImageStore(s => s.updateOutput)

  return (
    <div className="px-4 py-3 border-b border-white/10">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
        Output Format
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {FORMATS.map(f => (
          <button
            key={f.value}
            onClick={() => updateOutput('format', f.value)}
            className={cn(
              'py-1 rounded text-[11px] font-medium border transition-colors',
              output.format === f.value
                ? 'border-blue-500 bg-blue-600 text-white'
                : 'border-white/20 text-gray-400 hover:border-white/50 hover:text-white',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
