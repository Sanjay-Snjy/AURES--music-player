import { Loader2, Search } from 'lucide-react'
import { useLibrary } from '@renderer/store/library'
import { useUi } from '@renderer/store/ui'
import logoUrl from '@renderer/assets/icon.png'

export function TitleBar(): React.JSX.Element {
  const scanning = useLibrary((s) => s.scanning)
  const scanProgress = useLibrary((s) => s.scanProgress)
  const setSearchOpen = useUi((s) => s.setSearchOpen)

  return (
    <header className="titlebar">
      <div className="tb-left">
        <img className="tb-logo" src={logoUrl} alt="AURES" />
        <span className="tb-name">AURES</span>
      </div>
      <div className="tb-center">
        {scanning && scanProgress && (
          <div className="tb-scan" role="status">
            <Loader2 size={13} className="spin" />
            <span>
              {scanProgress.total > 0
                ? `Scanning music library… ${scanProgress.processed} / ${scanProgress.total} tracks`
                : 'Scanning music library…'}
            </span>
          </div>
        )}
      </div>
      <div className="tb-right">
        <button className="chip-btn" onClick={() => setSearchOpen(true)} title="Search (Ctrl+K)">
          <Search size={13} />
          <span>Search</span>
          <kbd>Ctrl K</kbd>
        </button>
      </div>
    </header>
  )
}