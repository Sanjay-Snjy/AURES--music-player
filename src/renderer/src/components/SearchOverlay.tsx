import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useLibrary } from '@renderer/store/library'
import { usePlayer } from '@renderer/store/player'
import { useUi } from '@renderer/store/ui'
import { albumHits, artistHits, genreHits, searchTracks } from '@renderer/utils/search'
import { Artwork } from './Artwork'
import { FormatBadge } from './Badges'

export function SearchOverlay(): React.JSX.Element | null {
  const open = useUi((s) => s.searchOpen)
  const setOpen = useUi((s) => s.setSearchOpen)
  const tracks = useLibrary((s) => s.tracks)
  const playContext = usePlayer((s) => s.playContext)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim()
    if (!q) return { songs: [], albums: [], artists: [], genres: [] }
    return {
      songs: searchTracks(tracks, q).slice(0, 30),
      albums: albumHits(tracks, q).slice(0, 10),
      artists: artistHits(tracks, q).slice(0, 10),
      genres: genreHits(tracks, q).slice(0, 8)
    }
  }, [tracks, query])

  if (!open) return null

  const close = (): void => setOpen(false)
  const noResults =
    results.songs.length === 0 &&
    results.albums.length === 0 &&
    results.artists.length === 0 &&
    results.genres.length === 0

  return (
    <div className="search-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="search-overlay" role="dialog" aria-label="Search">
        <div className="search-input-row">
          <Search size={17} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, albums, artists, genres…"
            aria-label="Search library"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results.songs.length > 0) {
                const ids = results.songs.map((t) => t.id)
                playContext(ids, 0)
                close()
              }
              if (e.key === 'Escape') close()
            }}
          />
          <kbd>Esc</kbd>
        </div>

        {!query.trim() ? (
          <div className="search-hint">
            <p>Search your local library.</p>
            <p className="search-hint-sub">Everything is indexed locally — nothing leaves your computer.</p>
          </div>
        ) : noResults ? (
          <div className="search-hint">
            <p>No results for “{query.trim()}”</p>
          </div>
        ) : (
          <div className="search-results">
            {results.songs.length > 0 && (
              <div className="search-group">
                <div className="search-group-title">Songs</div>
                {results.songs.map((t) => (
                  <div
                    key={t.id}
                    className="search-song"
                    onClick={() => {
                      playContext(results.songs.map((s) => s.id), results.songs.indexOf(t))
                      close()
                    }}
                  >
                    <Artwork src={t.artworkUrl} alt={t.title} size={34} radius={6} seed={1} />
                    <span className="search-song-title">{t.title}</span>
                    <span className="search-song-artist">{t.artist}</span>
                    <FormatBadge track={t} />
                  </div>
                ))}
              </div>
            )}
            {results.albums.length > 0 && (
              <div className="search-group">
                <div className="search-group-title">Albums</div>
                <div className="search-card-grid">
                  {results.albums.map((a) => (
                    <div
                      key={a.key}
                      className="search-card"
                      onClick={() => {
                        navigate(`/albums/${encodeURIComponent(a.key)}`)
                        close()
                      }}
                    >
                      <Artwork src={a.artworkUrl} alt={a.title} size={46} radius={7} seed={2} />
                      <span className="search-card-title">{a.title}</span>
                      <span className="search-card-sub">{a.artist}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {results.artists.length > 0 && (
              <div className="search-group">
                <div className="search-group-title">Artists</div>
                <div className="search-card-grid">
                  {results.artists.map((a) => (
                    <div
                      key={a.name}
                      className="search-card"
                      onClick={() => {
                        navigate(`/artists/${encodeURIComponent(a.name)}`)
                        close()
                      }}
                    >
                      <span className="search-card-title">{a.name}</span>
                      <span className="search-card-sub">
                        {a.albumCount} album{a.albumCount === 1 ? '' : 's'} • {a.trackCount} track
                        {a.trackCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {results.genres.length > 0 && (
              <div className="search-group">
                <div className="search-group-title">Genres</div>
                <div className="search-chip-row">
                  {results.genres.map((g) => (
                    <button
                      key={g.name}
                      className="chip"
                      onClick={() => {
                        navigate(`/genres/${encodeURIComponent(g.name)}`)
                        close()
                      }}
                    >
                      {g.name}
                      <span className="chip-count">{g.trackCount}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}