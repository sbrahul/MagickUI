import { useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { HexInput } from './hex-input.jsx'

export function ColorField({ value, onChange, label = 'Colour' }) {
  const [showPicker, setShowPicker] = useState(false)
  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowPicker(p => !p)}
        aria-label={label}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white"
      >
        <span className="inline-block w-6 h-6 rounded border border-white/20"
          style={{ backgroundColor: value }} />
        {value}
      </button>
      {showPicker && (
        <div>
          <HexColorPicker color={value} onChange={onChange} />
          <HexInput value={value} onChange={onChange}
            className="mt-1 w-full rounded bg-white/10 px-2 py-1 text-xs text-white font-mono" />
        </div>
      )}
    </div>
  )
}
