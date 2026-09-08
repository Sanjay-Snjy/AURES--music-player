import { EQ_FREQS } from '@renderer/store/audio'
import { usePlayer } from '@renderer/store/player'
import { SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [7, 6, 4.5, 3, 1.5, 0, -0.5, -0.5, 0, 0.5],
  'Treble Boost': [0, 0, 0, 0.5, 1, 1.5, 3, 4.5, 6, 7],
  Rock: [5, 4, 3, 1, 0, 0, 1, 2.5, 4, 5],
  Pop: [-1, 0, 2, 3.5, 3, 2, 0, -1, -1.5, -1],
  Classical: [3, 2, 1, 0, -1, -1, 0, 1.5, 2.5, 3],
  Jazz: [3, 2, 1.5, 1, 0.5, 0, 0, 0.5, 1, 1.5],
  Vocal: [-2, -1, -0.5, 1, 3.5, 4.5, 3.5, 1.5, 0, -1],
  Electronic: [5, 4, 2, 0, -1, -1, 0, 2, 3.5, 5]
}

function bandLabel(freq: number): string {
  if (freq >= 1000) return `${freq / 1000} kHz`
  return `${freq} Hz`
}

export function EQPanel({ compact = false }: { compact?: boolean }): React.JSX.Element {
  const navigate = useNavigate()
  const eqEnabled = usePlayer((s) => s.eqEnabled)
  const eqGains = usePlayer((s) => s.eqGains)
  const setEqEnabled = usePlayer((s) => s.setEqEnabled)
  const setEQGains = usePlayer((s) => s.setEQGains)

  const currentPreset = Object.entries(EQ_PRESETS).find(
    ([, gains]) => gains.every((g, i) => Math.abs(g - (eqGains[i] ?? 0)) < 0.01)
  )?.[0]

  const presetSelect = (
    <span className="preset-select-wrap">
      <select
        className="select"
        value={currentPreset ?? ''}
        onChange={(e) => {
          const gains = EQ_PRESETS[e.target.value]
          if (gains) setEQGains([...gains])
        }}
        aria-label="EQ preset"
      >
        <option value="" disabled>
          Presets
        </option>
        {Object.keys(EQ_PRESETS).map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <span className="preset-select-chevron" aria-hidden="true" />
    </span>
  )

  if (compact) {
    return (
      <div className="eq-panel eq-panel-compact">
        <label className="switch">
          <input
            type="checkbox"
            checked={eqEnabled}
            onChange={(e) => setEqEnabled(e.target.checked)}
          />
          <span className="switch-track" />
          <span className="switch-label">EQ</span>
        </label>
        <button
          className="icon-btn mini eq-settings-btn"
          onClick={() => navigate('/settings?tab=audio')}
          title="Open equalizer settings"
          aria-label="Open equalizer settings"
        >
          <SlidersHorizontal size={16} />
        </button>
        {presetSelect}
      </div>
    )
  }

  return (
    <div className="eq-panel">
      <div className="eq-head">
        <label className="switch">
          <input
            type="checkbox"
            checked={eqEnabled}
            onChange={(e) => setEqEnabled(e.target.checked)}
          />
          <span className="switch-track" />
          <span className="switch-label">Equalizer</span>
        </label>
        {presetSelect}
      </div>
      <div className={`eq-bands ${eqEnabled ? '' : 'eq-disabled'}`}>
        {EQ_FREQS.map((freq, i) => (
          <div key={freq} className="eq-band">
            <span className="eq-val">
              {eqGains[i] != null && eqGains[i] > 0 ? `+${eqGains[i]}` : eqGains[i] ?? 0}
            </span>
            <input
              type="range"
              min={-12}
              max={12}
              step={0.5}
              value={eqGains[i] ?? 0}
              aria-label={`EQ band ${bandLabel(freq)}`}
              className="eq-slider"
              style={{
                ['--fill' as string]: `${((((eqGains[i] ?? 0) + 12) / 24) * 100).toFixed(1)}%`
              }}
              onChange={(e) => {
                const next = [...eqGains]
                next[i] = Number(e.target.value)
                setEQGains(next)
              }}
            />
            <span className="eq-freq">{bandLabel(freq)}</span>
          </div>
        ))}
      </div>
      <p className="eq-note">
        {eqEnabled
          ? 'Adjusting bands with the Web Audio API — bypass anytime.'
          : 'Equalizer is off. Enable it to shape the sound.'}
      </p>
    </div>
  )
}