import { useParams } from 'react-router-dom'
import { useLibrary } from '@renderer/store/library'
import { TrackTable } from '@renderer/components/TrackTable'
import { EmptyState } from '@renderer/components/EmptyState'

export function GenrePage(): React.JSX.Element {
  const { genre } = useParams()
  const tracks = useLibrary((s) => s.tracks)
  const genreName = genre ? decodeURIComponent(genre) : ''

  const filtered = tracks.filter((t) =>
    t.genres.some((g) => g.toLowerCase() === genreName.toLowerCase())
  )

  if (filtered.length === 0) {
    return (
      <div className="page">
        <EmptyState title={`No songs in “${genreName}”`} subtitle="Try another genre." />
      </div>
    )
  }

  return (
    <div className="page songs-page">
      <div className="page-head">
        <div>
          <h1>{genreName}</h1>
          <p>{filtered.length.toLocaleString()} tracks</p>
        </div>
      </div>
      <TrackTable tracks={filtered} className="tt-fill" />
    </div>
  )
}