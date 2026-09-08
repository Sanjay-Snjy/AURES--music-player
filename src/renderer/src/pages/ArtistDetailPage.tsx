import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLibrary } from '@renderer/store/library'
import { AlbumCard, albumCardData } from '@renderer/components/AlbumCard'
import { TrackTable } from '@renderer/components/TrackTable'
import { EmptyState } from '@renderer/components/EmptyState'

export function ArtistDetailPage(): React.JSX.Element {
  const { name } = useParams()
  const navigate = useNavigate()
  const tracks = useLibrary((s) => s.tracks)
  const artistName = name ? decodeURIComponent(name) : ''

  const artistTracks = useMemo(
    () => tracks.filter((t) => t.artist === artistName),
    [tracks, artistName]
  )
  const albums = useMemo(() => albumCardData(artistTracks), [artistTracks])

  if (!artistName) {
    return <div className="page"><EmptyState title="Artist not found" /></div>
  }

  const totalDuration = artistTracks.reduce((a, t) => a + (t.duration ?? 0), 0)

  return (
    <div className="page artist-detail">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={15} />
        Back
      </button>
      <div className="artist-hero">
        <div className="artist-monogram lg" style={{ background: monogramGradient(artistName) }}>
          {artistName
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase()}
        </div>
        <div className="artist-hero-info">
          <div className="album-hero-type">Artist</div>
          <h1>{artistName}</h1>
          <p>
            {albums.length} album{albums.length === 1 ? '' : 's'} • {artistTracks.length} track
            {artistTracks.length === 1 ? '' : 's'} • {Math.floor(totalDuration / 60)} min
          </p>
        </div>
      </div>

      {albums.length > 0 && (
        <div className="artist-section">
          <h2>Albums</h2>
          <div className="album-grid">
            {albums.map((a) => (
              <AlbumCard key={a.key} album={a} />
            ))}
          </div>
        </div>
      )}

      <div className="artist-section">
        <h2>Songs</h2>
        <TrackTable
          tracks={artistTracks}
          showAlbum={true}
          showArtist={false}
          defaultSortKey="album"
        />
      </div>
    </div>
  )
}

function monogramGradient(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h} 42% 24%), hsl(${(h + 50) % 360} 50% 14%))`
}