import { Folder, FolderPlus, RefreshCw, Trash2 } from 'lucide-react'
import { useLibrary } from '@renderer/store/library'
import { EmptyState } from '@renderer/components/EmptyState'
import { toast } from '@renderer/store/ui'

export function FoldersPage(): React.JSX.Element {
  const folders = useLibrary((s) => s.folders)
  const tracks = useLibrary((s) => s.tracks)
  const scanning = useLibrary((s) => s.scanning)
  const addFolders = useLibrary((s) => s.addFolders)
  const rescanAll = useLibrary((s) => s.rescanAll)
  const removeFolder = useLibrary((s) => s.removeFolder)
  const importPaths = useLibrary((s) => s.importPaths)

  const trackCount = (folderPath: string): number =>
    tracks.filter((t) => {
      const f = t.path.toLowerCase()
      const p = folderPath.toLowerCase()
      return f === p || f.startsWith(p + '\\') || f.startsWith(p + '/')
    }).length

  return (
    <div className="page folders-page">
      <div className="page-head">
        <div>
          <h1>Folders</h1>
          <p>
            {folders.length} folder{folders.length === 1 ? '' : 's'} • files are read in place,
            never copied
          </p>
        </div>
        <div className="page-toolbar">
          <button className="btn" onClick={() => void addFolders()} disabled={scanning}>
            <FolderPlus size={15} />
            Add Music Folder
          </button>
          {folders.length > 0 && (
            <button className="btn" onClick={() => void rescanAll()} disabled={scanning}>
              <RefreshCw size={14} />
              Rescan all
            </button>
          )}
        </div>
      </div>

      {folders.length === 0 ? (
        <EmptyState
          icon={<Folder size={40} strokeWidth={1.1} />}
          title="No music folders"
          subtitle="Add a folder to scan for MP3, FLAC, WAV, M4A, AAC, OGG, OPUS and WMA files — including all subfolders."
          action={
            <button className="btn btn-primary btn-lg" onClick={() => void addFolders()}>
              <FolderPlus size={16} />
              Add Music Folder
            </button>
          }
        />
      ) : (
        <div className="folder-list">
          {folders.map((f) => (
            <div key={f.path} className="folder-row">
              <Folder size={18} className="folder-icon" />
              <div className="folder-info">
                <div className="folder-path" title={f.path}>
                  {f.path}
                </div>
                <div className="folder-sub">
                  {trackCount(f.path)} tracks • added{' '}
                  {new Date(f.addedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="folder-actions">
                <button
                  className="icon-btn mini"
                  title="Rescan this folder"
                  aria-label="Rescan this folder"
                  disabled={scanning}
                  onClick={() => {
                    void importPaths([f.path]).then(() => toast('Folder rescanned', 'success'))
                  }}
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  className="icon-btn mini danger-hover"
                  title="Remove folder from library"
                  aria-label="Remove folder from library"
                  onClick={() => removeFolder(f.path)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="folders-note">
        Tip: you can also drag music files or folders into the window from Explorer.
      </p>
    </div>
  )
}