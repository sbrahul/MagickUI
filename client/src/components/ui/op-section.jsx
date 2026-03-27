import { Switch } from './switch.jsx'

export function OpSection({ label, enabled, onToggle, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">{label}</span>
        {onToggle !== undefined && (
          <Switch checked={!!enabled} onCheckedChange={onToggle} />
        )}
      </div>
      {(enabled === undefined || enabled) && children}
    </div>
  )
}
