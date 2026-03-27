import * as RadixSwitch from '@radix-ui/react-switch'
import { cn } from '../../lib/utils.js'

export function Switch({ checked, onCheckedChange, disabled = false, className }) {
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
        checked ? 'bg-blue-600' : 'bg-white/20',
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      <RadixSwitch.Thumb
        className="block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 translate-x-0.5"
      />
    </RadixSwitch.Root>
  )
}
