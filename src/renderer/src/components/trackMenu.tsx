import { Heart, Info, ListMusic, Play, ListEnd, Plus, FolderOpen, Trash2, User, Disc3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Track } from '@shared/ipc'
import type { ContextMenuItem } from '@renderer/store/ui'
import { useUi, toast } from '@renderer/store/ui'
import { usePlayer } from '@renderer/store/player'
import { useUserData } from '@renderer/store/userData'
import { useLibrary } from '@renderer/store/library'

export function buildTrackMenu(track: Track, navigate: (to: string) => void): ContextMenuItem[] {
  const p = usePlayer.getState()
  const ud = useUserData.getState()
  const lib = useLibrary.getState()
  const ui = useUi.getState()
  const isFav = ud.favorites.includes(track.id)

  const playlistSubmenu: ContextMenuItem[] = ud.playlists.map((pl) => ({
    label: pl.name,
    onClick: () => {
      ud.addToPlaylist(pl.id, [track.id])
      toast(`Added to “${pl.name}”`, 'success')
    }
  }))
  playlistSubmenu.push({
    separator: true
  })
  playlistSubmenu.push({
    label: 'New playlist…',
    icon: <Plus size={14} />,
    onClick: () => {
      ui.setSearchOpen(false)
      const name = prompt('New playlist name') // eslint-disable-line no-alert
      if (name) {
        const pl = ud.createPlaylist(name)
        if (pl) {
          ud.addToPlaylist(pl.id, [track.id])
          toast(`Created “${name}”`, 'success')
        }
      }
    }
  })

  const items: ContextMenuItem[] = [
    {
      label: 'Play',
      icon: <Play size={15} />,
      onClick: () => p.playTrack(track.id)
    },
    {
      label: 'Play next',
      icon: <ListEnd size={15} />,
      onClick: () => {
        p.addToQueue([track.id], { next: true })
        toast('Will play next', 'info')
      }
    },
    {
      label: 'Add to queue',
      icon: <ListMusic size={15} />,
      onClick: () => {
        p.addToQueue([track.id], { next: true })
        toast('Added to play next', 'info')
      }
    },
    {
      label: 'Add to playlist',
      icon: <Plus size={15} />,
      submenu: playlistSubmenu
    },
    {
      separator: true
    },
    {
      label: isFav ? 'Remove from favorites' : 'Favorite',
      icon: <Heart size={15} fill={isFav ? 'currentColor' : 'none'} />,
      onClick: () => {
        const added = ud.toggleFavorite(track.id)
        toast(added ? 'Added to favorites' : 'Removed from favorites')
      }
    },
    {
      label: 'Open album',
      icon: <Disc3 size={15} />,
      onClick: () => navigate(`/albums/${encodeURIComponent(albumId(track))}`)
    },
    {
      label: 'Open artist',
      icon: <User size={15} />,
      onClick: () => navigate(`/artists/${encodeURIComponent(track.artist)}`)
    },
    {
      separator: true
    },
    {
      label: 'Show file location',
      icon: <FolderOpen size={15} />,
      onClick: () => window.snjy.showInFolder(track.path)
    },
    {
      label: 'Track information',
      icon: <Info size={15} />,
      onClick: () => ui.setTrackInfo(track)
    },
    {
      separator: true
    },
    {
      label: 'Remove from library',
      icon: <Trash2 size={15} />,
      danger: true,
      onClick: () => {
        lib.removeTracks([track.id])
        toast('Removed from library', 'info')
      }
    }
  ]
  return items
}

export function albumId(track: Track): string {
  return `${track.album}\u0000${track.albumArtist}`
}

/** Hook: right-click a track anywhere to open its context menu. */
export function useTrackContextMenu(): (e: { clientX: number; clientY: number }, track: Track) => void {
  const navigate = useNavigate()
  return (e, track) => {
    useUi.getState().openContextMenu(e.clientX, e.clientY, buildTrackMenu(track, navigate))
  }
}