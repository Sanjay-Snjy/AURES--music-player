import { NavLink } from 'react-router-dom'
import {
  Disc3,
  Folder,
  Heart,
  Home,
  Music,
  Settings,
  Shapes,
  Users
} from 'lucide-react'
import { useLibrary } from '@renderer/store/library'
import { useUserData } from '@renderer/store/userData'

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
  countKey?: 'favorites' | 'playlists'
}

const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/songs', label: 'Songs', icon: Music },
  { to: '/albums', label: 'Albums', icon: Disc3 },
  { to: '/artists', label: 'Artists', icon: Users },
  { to: '/genres', label: 'Genres', icon: Shapes },
  { to: '/folders', label: 'Folders', icon: Folder },
  { to: '/favorites', label: 'Favorites', icon: Heart, countKey: 'favorites' }
]

export function Sidebar(): React.JSX.Element {
  const trackCount = useLibrary((s) => s.tracks.length)
  const favoritesCount = useUserData((s) => s.favorites.length)

  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebar-nav">
        {NAV.map((item) => {
          const Icon = item.icon
          const count =
            item.countKey === 'favorites'
              ? favoritesCount
              : 0
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? false}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon size={18} strokeWidth={1.8} />
              {count > 0 && <span className="nav-dot" />}
            </NavLink>
          )
        })}
      </div>
      <div className="sidebar-bottom">
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={18} strokeWidth={1.8} />
        </NavLink>
        {trackCount > 0 && (
          <span className="sidebar-stats" title={`${trackCount} tracks in library`}>
            {trackCount > 999 ? `${(trackCount / 1000).toFixed(1)}k` : trackCount}
          </span>
        )}
      </div>
    </nav>
  )
}