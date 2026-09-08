import { useSearchParams } from 'react-router-dom'
import {
  Activity,
  AppWindow,
  AudioLines,
  FolderOpen,
  Keyboard,
  MonitorCog,
  Music4,
  Play,
  Sparkles
} from 'lucide-react'
import { useUserData } from '@renderer/store/userData'
import { useLibrary } from '@renderer/store/library'
import { usePlayer } from '@renderer/store/player'
import { EQPanel } from '@renderer/components/EQPanel'
import { VISUALIZERS, VISUALIZER_KEYS } from '@renderer/visualizers/VisualizerEngine'
import { formatBytes } from '@renderer/utils/format'
import logoUrl from '@renderer/assets/logo.png'

const TABS = [
  { id: 'general', label: 'General', icon: MonitorCog },
  { id: 'library', label: 'Library', icon: FolderOpen },
  { id: 'playback', label: 'Playback', icon: Play },
  { id: 'audio', label: 'Audio', icon: AudioLines },
  { id: 'visualization', label: 'Visualization', icon: Activity },
  { id: 'appearance', label: 'Appearance', icon: Sparkles },
  { id: 'shortcuts', label: 'Keyboard shortcuts', icon: Keyboard },
  { id: 'about', label: 'About', icon: AppWindow }
] as const

type TabId = (typeof TABS)[number]['id']

export function SettingsPage(): React.JSX.Element {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') ?? 'general') as TabId

  const settings = useUserData((s) => s.settings)
  const setSettings = useUserData((s) => s.setSettings)
  const folders = useLibrary((s) => s.folders)
  const tracks = useLibrary((s) => s.tracks)
  const scanning = useLibrary((s) => s.scanning)
  const addFolders = useLibrary((s) => s.addFolders)
  const rescanAll = useLibrary((s) => s.rescanAll)
  const removeFolder = useLibrary((s) => s.removeFolder)
  const volume = usePlayer((s) => s.volume)
  const playbackRate = usePlayer((s) => s.playbackRate)
  const shuffle = usePlayer((s) => s.shuffle)
  const repeat = usePlayer((s) => s.repeat)
  const setVolume = usePlayer((s) => s.setVolume)
  const cyclePlaybackRate = usePlayer((s) => s.cyclePlaybackRate)
  const toggleShuffle = usePlayer((s) => s.toggleShuffle)
  const cycleRepeat = usePlayer((s) => s.cycleRepeat)

  const setTab = (id: TabId): void => setParams({ tab: id })

  return (
    <div className="page settings-page">
      <div className="settings-head">
        <h1>Settings</h1>
      </div>
      <div className="settings-layout">
        <div className="settings-tabs">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                className={`settings-tab ${tab === t.id ? 'settings-tab-active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <Icon size={15} />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="settings-content">
          {tab === 'general' && (
            <>
              <SettingToggle
                label="Scan on launch"
                desc="Automatically re-scan your music folders for new files when the app starts."
                checked={settings.scanOnLaunch}
                onChange={(v) => setSettings({ scanOnLaunch: v })}
              />
            </>
          )}

          {tab === 'library' && (
            <div className="settings-section">
              <div className="settings-row">
                <div>
                  <div className="settings-label">Music folders</div>
                  <div className="settings-desc">
                    {folders.length} folder{folders.length === 1 ? '' : 's'} •{' '}
                    {tracks.length.toLocaleString()} tracks • files are never copied or uploaded
                  </div>
                </div>
                <div className="settings-actions">
                  <button className="btn" onClick={() => void addFolders()} disabled={scanning}>
                    Add folder
                  </button>
                  <button className="btn" onClick={() => void rescanAll()} disabled={scanning}>
                    Rescan all
                  </button>
                </div>
              </div>
              {folders.map((f) => (
                <div key={f.path} className="settings-folder">
                  <span title={f.path}>{f.path}</span>
                  <button
                    className="icon-btn mini danger-hover"
                    title="Remove folder"
                    aria-label="Remove folder"
                    onClick={() => removeFolder(f.path)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="settings-note">
                Supported formats: MP3, WAV, FLAC, M4A, AAC, OGG, OPUS, WMA.
              </div>
            </div>
          )}

          {tab === 'playback' && (
            <>
              <SettingRow label="Volume" value={`${Math.round(volume * 100)}%`}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Volume"
                />
              </SettingRow>
              <SettingRow label="Playback speed" value={`${playbackRate}x`}>
                <div className="chip-row">
                  {[1, 1.25, 1.5, 2].map((r) => (
                    <button
                      key={r}
                      className={`chip ${playbackRate === r ? 'chip-active' : ''}`}
                      onClick={() => cyclePlaybackRate()}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              </SettingRow>
              <SettingToggle
                label="Shuffle"
                desc="Randomize track order when skipping."
                checked={shuffle}
                onChange={() => toggleShuffle()}
              />
              <SettingRow label="Repeat" value={repeat}>
                <div className="chip-row">
                  {(['off', 'all', 'one'] as const).map((r) => (
                    <button
                      key={r}
                      className={`chip ${repeat === r ? 'chip-active' : ''}`}
                      onClick={() => {
                        while (usePlayer.getState().repeat !== r) cycleRepeat()
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </SettingRow>
            </>
          )}

          {tab === 'audio' && <EQPanel />}

          {tab === 'visualization' && (
            <>
              <div className="settings-label">Mode</div>
              <div className="chip-row">
                {VISUALIZER_KEYS.map((key) => (
                  <button
                    key={key}
                    className={`chip ${settings.visualizerMode === key ? 'chip-active' : ''}`}
                    onClick={() => setSettings({ visualizerMode: key })}
                  >
                    {VISUALIZERS[key].name}
                  </button>
                ))}
              </div>
              <SettingToggle
                label="AUTO mode"
                desc="Automatically switch visualizers based on the music's energy — high-energy songs get Cosmic or Particles, calm songs get Aurora or Fluid."
                checked={settings.visualizerAuto}
                onChange={(v) => setSettings({ visualizerAuto: v })}
              />
              <SettingToggle
                label="Low performance mode"
                desc="Reduces particle counts and disables glow effects for smooth 60 FPS on weaker PCs."
                checked={settings.lowPerformanceMode}
                onChange={(v) => setSettings({ lowPerformanceMode: v })}
              />
              {settings.visualizerMode === 'spectrum' && (
                <SettingToggle
                  label="Symmetrical spectrum"
                  desc="Mirror the frequency bars around the center line."
                  checked={settings.spectrumSymmetry}
                  onChange={(v) => setSettings({ spectrumSymmetry: v })}
                />
              )}
              {settings.visualizerMode === 'waveform' && (
                <>
                  <div className="settings-label">Waveform style</div>
                  <div className="chip-row">
                    {(['horizontal', 'mirror', 'circular'] as const).map((s) => (
                      <button
                        key={s}
                        className={`chip ${settings.waveformStyle === s ? 'chip-active' : ''}`}
                        onClick={() => setSettings({ waveformStyle: s })}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'appearance' && (
            <>
              <SettingToggle
                label="Dynamic artwork colors"
                desc="Extract dominant colors from the current album artwork and use them for ambient lighting."
                checked={settings.dynamicArtworkColors}
                onChange={(v) => setSettings({ dynamicArtworkColors: v })}
              />
            </>
          )}

          {tab === 'shortcuts' && (
            <div className="shortcut-list">
              {SHORTCUTS.map(([keys, desc]) => (
                <div key={keys} className="shortcut-row">
                  <span className="shortcut-desc">{desc}</span>
                  <span className="shortcut-keys">
                    {keys.split(' + ').map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </span>
                </div>
              ))}
              <div className="settings-note">Windows media keys are also supported.</div>
            </div>
          )}

          {tab === 'about' && (
            <div className="about-section">
              <div className="about-logo">
                  <img src={logoUrl} alt="AURES" />
              </div>
              <h2>AURES — Offline Music Player</h2>
              <p>
                A premium, fully offline desktop music player. Your music never leaves your
                computer — no accounts, no cloud, no tracking.
              </p>
              <div className="about-stats">
                <div>
                  <b>{tracks.length.toLocaleString()}</b>
                  <span>tracks</span>
                </div>
                <div>
                  <b>{folders.length}</b>
                  <span>folders</span>
                </div>
                <div>
                  <b>{formatBytes(tracks.reduce((a, t) => a + t.fileSize, 0))}</b>
                  <span>indexed</span>
                </div>
              </div>
              <p className="about-tech">
                Electron • React • TypeScript • Vite • Web Audio API • Canvas visualizers
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const SHORTCUTS: Array<[string, string]> = [
  ['Space', 'Play / Pause'],
  ['←', 'Seek backward 5 seconds'],
  ['→', 'Seek forward 5 seconds'],
  ['Ctrl + ←', 'Previous track'],
  ['Ctrl + →', 'Next track'],
  ['↑', 'Volume up'],
  ['↓', 'Volume down'],
  ['M', 'Mute / Unmute'],
  ['Ctrl + K', 'Search'],
  ['Esc', 'Close dialogs'],
  ['F12', 'Developer tools']
]

function SettingRow({
  label,
  desc,
  value,
  children
}: {
  label: string
  desc?: string
  value?: string
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="settings-row">
      <div>
        <div className="settings-label">{label}</div>
        {desc && <div className="settings-desc">{desc}</div>}
      </div>
      {value && <span className="settings-value">{value}</span>}
      {children}
    </div>
  )
}

function SettingToggle({
  label,
  desc,
  checked,
  onChange
}: {
  label: string
  desc?: string
  checked: boolean
  onChange: (v: boolean) => void
}): React.JSX.Element {
  return (
    <div className="settings-row">
      <div>
        <div className="settings-label">{label}</div>
        {desc && <div className="settings-desc">{desc}</div>}
      </div>
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch-track" />
      </label>
    </div>
  )
}