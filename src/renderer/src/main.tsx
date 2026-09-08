import { createRoot } from 'react-dom/client'
import { App } from './App'
import { useLibrary } from './store/library'
import { useUserData } from './store/userData'
import { usePlayer } from './store/player'
import { registerPersistedSlices } from './store/persist'
import './styles/base.css'
import './styles/ui.css'
import './styles/pages.css'

async function bootstrap(): Promise<void> {
  try {
    const state = await window.snjy.getInitialState()
    useLibrary.getState().hydrate(state.library)
    useUserData.getState().hydrate(state.appData)
    usePlayer.getState().hydrate(state.appData.player)

    registerPersistedSlices(
      () => {
        const p = usePlayer.getState()
        return {
          volume: p.volume,
          muted: p.muted,
          playbackRate: p.playbackRate,
          shuffle: p.shuffle,
          repeat: p.repeat,
          eqEnabled: p.eqEnabled,
          eqGains: p.eqGains,
          lastTrackId: p.lastTrackId,
          lastPosition: p.lastPosition
        }
      },
      () => {
        const u = useUserData.getState()
        return {
          favorites: u.favorites,
          playlists: u.playlists,
          recentlyPlayed: u.recentlyPlayed,
          playCounts: u.playCounts,
          history: u.history,
          settings: u.settings
        }
      }
    )

    // Auto-rescan on launch when enabled.
    if (state.appData.settings.scanOnLaunch && state.library.folders.length > 0) {
      void useLibrary.getState().rescanAll()
    }
  } catch (err) {
    console.error('Failed to load persisted state', err)
  }

  const root = document.getElementById('root')
  if (root) {
    createRoot(root).render(<App />)
  }
}

void bootstrap()