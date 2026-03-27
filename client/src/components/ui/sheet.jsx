import * as RadixDialog from '@radix-ui/react-dialog'
import { cn } from '../../lib/utils.js'

export const Sheet        = RadixDialog.Root
export const SheetTrigger = RadixDialog.Trigger
export const SheetTitle   = RadixDialog.Title

export function SheetContent({ children, className, ...props }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
      <RadixDialog.Content
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-gray-900 border-t border-white/10 p-4 max-h-[85vh] overflow-y-auto',
          className,
        )}
        {...props}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}

export function SheetHeader({ children, className }) {
  return <div className={cn('mb-3 flex items-center justify-between', className)}>{children}</div>
}
