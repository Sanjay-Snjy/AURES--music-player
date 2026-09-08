import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shapes } from 'lucide-react'
import { useLibrary } from '@renderer/store/library'
import { genreHits } from '@renderer/utils/search'
import { EmptyState } from '@renderer/components/EmptyState'

export function GenresPage(): React.JSX.Element {
  const tracks = useLibrary((s) => s.tracks)
  const navigate = useNavigate()
  const genres = useMemo(() => genreHits(tracks, ''), [tracks])

  if (tracks.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon={<Shapes size={40} strokeWidth={1.1} />}
          title="No genres yet"
          subtitle="Genres are read from your files' tags once music is added."
        />
      </div>
    )
  }

  return (
    <div className="page genres-page">
      <div className="page-head">
        <h1>Genres</h1>
        <p>{genres.length.toLocaleString()} genres</p>
      </div>
      <div className="genre-chip-grid">
        {genres.map((g) => (
          <button
            key={g.name}
            className="genre-chip"
            onClick={() => navigate(`/genres/${encodeURIComponent(g.name)}`)}
          >
            <span className="genre-chip-name">{g.name}</span>
            <span className="chip-count">{g.trackCount}</span>
          </button>
        ))}
      </div>
    </div>
  )
}