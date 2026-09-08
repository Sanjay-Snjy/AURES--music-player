import { useEffect } from 'react'
import { audioEngine } from '@renderer/store/audio'
import { usePlayer } from '@renderer/store/player'
import { flushPersistence, persistAppData } from '@renderer/store/persist'

export function useMediaSession(): void {
  useEffect(() => {
    const unsub = window.snjy.onMediaKey((key) => {
      const p = usePlayer.getState()
      switch (key) {
        case 'playpause':
          p.togglePlay()
          break
        case 'next':
          p.next()
          break
        case 'prev':
          p.prev()
          break
        case 'stop':
          p.stop()
          break
      }
    })

    const savePosition = (): void => {
      const s = usePlayer.getState()
      if (s.currentId) {
        usePlayer.setState({
          lastTrackId: s.currentId,
          lastPosition: audioEngine.currentTime
        })
        persistAppData()
      }
      flushPersistence()
    }

    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') savePosition()
    }
    window.addEventListener('beforeunload', savePosition)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      unsub()
      window.removeEventListener('beforeunload', savePosition)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}