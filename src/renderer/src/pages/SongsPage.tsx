import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Music, Search } from 'lucide-react'
import { useLibrary } from '@renderer/store/library'
import { TrackTable } from '@renderer/components/TrackTable'
import { EmptyState } from '@renderer/components/EmptyState'
import { searchTracks } from '@renderer/utils/search'

export function SongsPage(): React.JSX.Element {
  const tracks = useLibrary((s) => s.tracks)
  const hydrated = useLibrary((s) => s.hydrated)
  const [params] = useSearchParams()
  const genreFilter = params.get('genre') ?? ''
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    let list = tracks
    if (genreFilter) {
      const g = genreFilter.toLowerCase()
      list = list.filter((t) => t.genres.some((x) => x.toLowerCase() === g))
    }
    return searchTracks(list, query)
  }, [tracks, genreFilter, query])

  if (!hydrated) {
    return (
      <div className="page page-center">
        <div className="spin-loader" />
      </div>
    )
  }

  if (tracks.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon={<Music size={40} strokeWidth={1.1} />}
          title="No songs yet"
          subtitle="Add a music folder from Home or the Folders page to start your library."
        />
      </div>
    )
  }

  return (
    <div className="page songs-page">
      <div className="page-head">
        <div>
          <h1>{genreFilter ? genreFilter : 'Songs'}</h1>
          <p>
            {filtered.length.toLocaleString()} of {tracks.length.toLocaleString()} tracks
          </p>
        </div>
        <div className="page-toolbar">
          <div className="search-box">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter songs…"
              aria-label="Filter songs"
            />
          </div>
        </div>
      </div>
      <TrackTable tracks={filtered} className="tt-fill" />
    </div>
  )
}