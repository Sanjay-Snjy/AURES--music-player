import { usePlayer } from '@renderer/store/player'

interface SeekbarProps {
  showTimes?: boolean
  className?: string
}

export function Seekbar({ showTimes = true, className = '' }: SeekbarProps): React.JSX.Element {
  const currentTime = usePlayer((s) => s.currentTime)
  const duration = usePlayer((s) => s.duration)
  const seek = usePlayer((s) => s.seek)

  const max = duration > 0 ? duration : 0
  const pct = max > 0 ? Math.min(100, (currentTime / max) * 100) : 0

  return (
    <div className={`seekbar ${className}`}>
      {showTimes && <span className="seek-time">{fmt(currentTime)}</span>}
      <input
        type="range"
        className="seek-input"
        min={0}
        max={max || 0}
        step={0.05}
        value={Math.min(currentTime, max || 0)}
        style={{ ['--fill' as string]: `${pct}%` }}
        aria-label="Seek"
        onChange={(e) => seek(Number(e.target.value))}
        disabled={max === 0}
      />
      {showTimes && <span className="seek-time">{fmt(max)}</span>}
    </div>
  )
}

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const total = Math.floor(s)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}