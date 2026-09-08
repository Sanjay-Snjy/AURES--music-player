import { useEffect } from 'react'
import { FolderInput } from 'lucide-react'
import { useUi } from '@renderer/store/ui'
import { useLibrary } from '@renderer/store/library'
import { toast } from '@renderer/store/ui'

export function DropZone(): React.JSX.Element | null {
  const dropOverlay = useUi((s) => s.dropOverlay)
  const setDropOverlay = useUi((s) => s.setDropOverlay)
  const importPaths = useLibrary((s) => s.importPaths)

  useEffect(() => {
    let depth = 0

    const onDragEnter = (e: DragEvent): void => {
      if (e.dataTransfer?.types.includes('Files')) {
        depth++
        setDropOverlay(true)
      }
    }
    const onDragOver = (e: DragEvent): void => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }
    }
    const onDragLeave = (e: DragEvent): void => {
      if (e.dataTransfer?.types.includes('Files')) {
        depth = Math.max(0, depth - 1)
        if (depth === 0) setDropOverlay(false)
      }
    }
    const onDrop = (e: DragEvent): void => {
      e.preventDefault()
      depth = 0
      setDropOverlay(false)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length === 0) return
      const paths = files
        .map((f) => {
          try {
            return window.snjy.getPathForFile(f)
          } catch {
            return ''
          }
        })
        .filter(Boolean)
      if (paths.length === 0) {
        toast('Could not read dropped files', 'error')
        return
      }
      void importPaths(paths).then(() => {
        toast(paths.length > 1 ? 'Importing dropped items…' : 'Importing dropped item…')
      })
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [importPaths, setDropOverlay])

  if (!dropOverlay) return null

  return (
    <div className="drop-overlay">
      <div className="drop-card">
        <FolderInput size={44} strokeWidth={1.2} />
        <h3>Drop to add to library</h3>
        <p>Music files and folders will be imported and scanned</p>
      </div>
    </div>
  )
}