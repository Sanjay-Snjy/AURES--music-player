import { useMemo } from 'react'
import { Heart } from 'lucide-react'
import { useLibrary } from '@renderer/store/library'
import { useUserData } from '@renderer/store/userData'
import { TrackTable } from '@renderer/components/TrackTable'
import { EmptyState } from '@renderer/components/EmptyState'

export function FavoritesPage(): React.JSX.Element {
  const tracksById = useLibrary((s) => s.tracksById)
  const favorites = useUserData((s) => s.favorites)

  const favTracks = useMemo(
    () => favorites.map((id) => tracksById[id]).filter((t): t is NonNullable<typeof t> => !!t),
    [favorites, tracksById]
  )

  if (favTracks.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon={<Heart size={40} strokeWidth={1.1} />}
          title="No favorites yet"
          subtitle="Tap the heart on any song to keep it here."
        />
      </div>
    )
  }

  return (
    <div className="page songs-page">
      <div className="page-head">
        <h1>Favorites</h1>
        <p>{favTracks.length.toLocaleString()} songs</p>
      </div>
      <TrackTable tracks={favTracks} className="tt-fill" defaultSortKey="dateAdded" />
    </div>
  )
}