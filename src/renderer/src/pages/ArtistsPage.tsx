import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { useLibrary } from '@renderer/store/library'
import { EmptyState } from '@renderer/components/EmptyState'
import { artistHits } from '@renderer/utils/search'

export function ArtistsPage(): React.JSX.Element {
  const tracks = useLibrary((s) => s.tracks)
  const navigate = useNavigate()
  const artists = useMemo(() => artistHits(tracks, ''), [tracks])

  if (tracks.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon={<Users size={40} strokeWidth={1.1} />}
          title="No artists yet"
          subtitle="Artists will appear here once your library has music."
        />
      </div>
    )
  }

  return (
    <div className="page artists-page">
      <div className="page-head">
        <h1>Artists</h1>
        <p>{artists.length.toLocaleString()} artists</p>
      </div>
      <div className="artist-grid">
        {artists.map((a, i) => (
          <div
            key={a.name}
            className="artist-card"
            onClick={() => navigate(`/artists/${encodeURIComponent(a.name)}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/artists/${encodeURIComponent(a.name)}`)}
            aria-label={`Open artist ${a.name}`}
          >
            <div className="artist-monogram" style={{ background: monogramGradient(a.name) }}>
              {a.name
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase()}
            </div>
            <div className="artist-card-name">{a.name}</div>
            <div className="artist-card-sub">
              {a.albumCount} album{a.albumCount === 1 ? '' : 's'} • {a.trackCount} track
              {a.trackCount === 1 ? '' : 's'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function monogramGradient(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h} 42% 24%), hsl(${(h + 50) % 360} 50% 14%))`
}