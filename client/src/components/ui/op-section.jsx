import { Switch } from './switch.jsx'

export function OpSection({ label, enabled, onToggle, children }) {
  const isActive = enabled === undefined || !!enabled
  return (
    <div className={`rounded-lg border ${isActive && enabled !== undefined ? 'border-white/15 bg-white/5' : 'border-white/8'}`}>
      <div className={`flex items-center justify-between px-3 py-2 ${isActive && enabled !== undefined ? 'border-b border-white/10' : ''}`}>
        <span className={`text-xs font-semibold uppercase tracking-wide ${isActive && enabled !== undefined ? 'text-white' : 'text-gray-400'}`}>{label}</span>
        {onToggle !== undefined && (
          <Switch checked={!!enabled} onCheckedChange={onToggle} />
        )}
      </div>
      {isActive && children && (
        <div className="px-3 py-3">
          {children}
        </div>
      )}
    </div>
  )
}
