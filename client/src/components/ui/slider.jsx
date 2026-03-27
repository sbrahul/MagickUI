import * as RadixSlider from '@radix-ui/react-slider'
import { cn } from '../../lib/utils.js'

export function Slider({ className, value, onValueChange, min = 0, max = 100, step = 1, disabled = false }) {
  return (
    <RadixSlider.Root
      className={cn('relative flex items-center select-none touch-none w-full h-5', className)}
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
    >
      <RadixSlider.Track className="bg-white/10 relative grow rounded-full h-1.5">
        <RadixSlider.Range className="absolute bg-blue-500 rounded-full h-full" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        className="block w-4 h-4 bg-white rounded-full shadow-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
      />
    </RadixSlider.Root>
  )
}
