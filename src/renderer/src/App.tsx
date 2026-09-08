import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { AuresDeck } from './components/AuresDeck'
import { MiniPlayer } from './components/MiniPlayer'
import { ToastHost } from './components/ToastHost'
import { ContextMenu } from './components/ContextMenu'
import { SearchOverlay } from './components/SearchOverlay'
import { TrackInfoModal } from './components/TrackInfoModal'
import { ScanBanner } from './components/ScanBanner'
import { DropZone } from './components/DropZone'
import { HomePage } from './pages/HomePage'
import { SongsPage } from './pages/SongsPage'
import { AlbumsPage } from './pages/AlbumsPage'
import { AlbumDetailPage } from './pages/AlbumDetailPage'
import { ArtistsPage } from './pages/ArtistsPage'
import { ArtistDetailPage } from './pages/ArtistDetailPage'
import { GenresPage } from './pages/GenresPage'
import { GenrePage } from './pages/GenrePage'
import { FoldersPage } from './pages/FoldersPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { NowPlayingPage } from './pages/NowPlayingPage'
import { SettingsPage } from './pages/SettingsPage'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMediaSession } from './hooks/useMediaSession'
import { useUi } from './store/ui'
import logoUrl from './assets/logo.png'

function Shell(): React.JSX.Element {
  const miniMode = useUi((s) => s.miniMode)

  useKeyboardShortcuts()
  useMediaSession()

  if (miniMode) {
    return (
      <>
        <MiniPlayer />
        <ToastHost />
        <ContextMenu />
      </>
    )
  }

  return (
    <div className="app-shell">
      <TitleBar />
      <div className="app-body">
        <div className="sidebar-column">
          <NavLink to="/" className="sidebar-logo" title="AURES home" aria-label="AURES home">
            <img src={logoUrl} alt="AURES" />
          </NavLink>
          <Sidebar />
        </div>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/songs" element={<SongsPage />} />
            <Route path="/albums" element={<AlbumsPage />} />
            <Route path="/albums/:albumId" element={<AlbumDetailPage />} />
            <Route path="/artists" element={<ArtistsPage />} />
            <Route path="/artists/:name" element={<ArtistDetailPage />} />
            <Route path="/genres" element={<GenresPage />} />
            <Route path="/genres/:genre" element={<GenrePage />} />
            <Route path="/folders" element={<FoldersPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/now-playing" element={<NowPlayingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
      <AuresDeck />
      <ScanBanner />
      <DropZone />
      <ToastHost />
      <ContextMenu />
      <SearchOverlay />
      <TrackInfoModal />
    </div>
  )
}

export function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}