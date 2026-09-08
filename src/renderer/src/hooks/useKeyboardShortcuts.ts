import { useEffect } from 'react'
import { usePlayer } from '@renderer/store/player'
import { useUi } from '@renderer/store/ui'

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        useUi.getState().setSearchOpen(!useUi.getState().searchOpen)
        return
      }
      if (typing) return

      const p = usePlayer.getState()
      const ui = useUi.getState()

      switch (e.key) {
        case ' ':
          e.preventDefault()
          p.togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (e.ctrlKey) p.prev()
          else p.seekBy(-5)
          break
        case 'ArrowRight':
          e.preventDefault()
          if (e.ctrlKey) p.next()
          else p.seekBy(5)
          break
        case 'ArrowUp':
          e.preventDefault()
          p.setVolume(p.volume + 0.05)
          break
        case 'ArrowDown':
          e.preventDefault()
          p.setVolume(p.volume - 0.05)
          break
        case 'm':
        case 'M':
          p.toggleMute()
          break
        case 'Escape':
          if (ui.contextMenu) ui.closeContextMenu()
          if (ui.queueOpen) ui.setQueueOpen(false)
          if (ui.searchOpen) ui.setSearchOpen(false)
          if (ui.trackInfo) ui.setTrackInfo(null)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}