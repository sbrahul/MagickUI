const GRAVITY_GRID = [
  ['NorthWest', 'North', 'NorthEast'],
  ['West',      'Center', 'East'    ],
  ['SouthWest', 'South', 'SouthEast'],
]
const GRAVITY_LABELS = {
  NorthWest: 'NW', North: 'N', NorthEast: 'NE',
  West: 'W', Center: 'C', East: 'E',
  SouthWest: 'SW', South: 'S', SouthEast: 'SE',
}

export function GravityGrid({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-1 w-fit mx-auto">
      {GRAVITY_GRID.flat().map(g => (
        <button key={g}
          onClick={() => onChange(g)}
          aria-label={g}
          aria-pressed={value === g}
          className={`w-10 h-10 rounded text-xs font-medium transition-colors ${value === g ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}>
          {GRAVITY_LABELS[g]}
        </button>
      ))}
    </div>
  )
}
