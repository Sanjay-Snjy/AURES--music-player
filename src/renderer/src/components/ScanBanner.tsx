import { Loader2, X } from 'lucide-react'
import { useLibrary } from '@renderer/store/library'

export function ScanBanner(): React.JSX.Element | null {
  const scanning = useLibrary((s) => s.scanning)
  const progress = useLibrary((s) => s.scanProgress)
  const cancelScan = useLibrary((s) => s.cancelScan)

  if (!scanning || !progress) return null

  const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : null
  const current = progress.current ? progress.current.split(/[\\/]/).pop() : ''

  return (
    <div className="scan-banner" role="status">
      <Loader2 size={15} className="spin" />
      <div className="scan-info">
        <div className="scan-line">
          <span>Scanning music library…</span>
          {pct != null && <span className="scan-pct">{pct}%</span>}
        </div>
        <div className="scan-progress">
          <div className="scan-progress-fill" style={{ width: `${pct ?? 5}%` }} />
        </div>
        <div className="scan-file">
          {progress.total > 0
            ? `${progress.processed} / ${progress.total} tracks${current ? ` — ${current}` : ''}`
            : 'Discovering files…'}
        </div>
      </div>
      <button className="icon-btn mini" onClick={cancelScan} title="Cancel scan" aria-label="Cancel scan">
        <X size={14} />
      </button>
    </div>
  )
}