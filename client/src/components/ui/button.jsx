import { cn } from '../../lib/utils.js'

export function Button({ variant = 'default', className, children, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'default'     && 'bg-blue-600 hover:bg-blue-700 text-white',
        variant === 'ghost'       && 'hover:bg-white/10 text-gray-400 hover:text-white',
        variant === 'destructive' && 'bg-red-600 hover:bg-red-700 text-white',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
