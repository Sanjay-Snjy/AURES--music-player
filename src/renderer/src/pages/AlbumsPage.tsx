import { useMemo } from 'react'
import { Disc3 } from 'lucide-react'
import { useLibrary } from '@renderer/store/library'
import { AlbumCard, albumCardData } from '@renderer/components/AlbumCard'
import { EmptyState } from '@renderer/components/EmptyState'

export function AlbumsPage(): React.JSX.Element {
  const tracks = useLibrary((s) => s.tracks)
  const albums = useMemo(() => albumCardData(tracks), [tracks])

  if (tracks.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon={<Disc3 size={40} strokeWidth={1.1} />}
          title="No albums yet"
          subtitle="Your albums will appear here once you add a music folder."
        />
      </div>
    )
  }

  return (
    <div className="page albums-page">
      <div className="page-head">
        <h1>Albums</h1>
        <p>{albums.length.toLocaleString()} albums</p>
      </div>
      <div className="album-grid">
        {albums.map((a) => (
          <AlbumCard key={a.key} album={a} />
        ))}
      </div>
    </div>
  )
}