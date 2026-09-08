import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useUi } from '@renderer/store/ui'
import type { ContextMenuItem } from '@renderer/store/ui'

function MenuList({
  items,
  onAction,
  depth
}: {
  items: ContextMenuItem[]
  onAction: () => void
  depth: number
}): React.JSX.Element {
  const [openSub, setOpenSub] = useState<string | null>(null)

  return (
    <div className="ctx-menu" role="menu" style={{ marginLeft: depth > 0 ? 4 : 0 }}>
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={`sep-${i}`} className="ctx-sep" />
        }
        return (
          <div
            key={i}
            className={`ctx-item ${item.danger ? 'ctx-danger' : ''} ${item.disabled ? 'ctx-disabled' : ''}`}
            role="menuitem"
            onMouseEnter={() => setOpenSub(item.submenu ? String(i) : null)}
            onClick={() => {
              if (item.disabled) return
              if (item.submenu) return
              item.onClick?.()
              onAction()
            }}
          >
            {item.icon && <span className="ctx-icon">{item.icon}</span>}
            <span className="ctx-label">{item.label}</span>
            {item.submenu && (
              <>
                <ChevronRight size={13} className="ctx-chev" />
                {openSub === String(i) && (
                  <div className="ctx-submenu">
                    <MenuList items={item.submenu} onAction={onAction} depth={depth + 1} />
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function ContextMenu(): React.JSX.Element | null {
  const menu = useUi((s) => s.contextMenu)
  const close = useUi((s) => s.closeContextMenu)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    // Close on outside pointer-down (capture phase). Clicks INSIDE the menu
    // are never swallowed, so a menu item click always registers even if the
    // same gesture races with menu open/close state changes.
    const onPointerDown = (e: PointerEvent): void => {
      const root = ref.current
      if (root && e.target instanceof Node && root.contains(e.target)) return
      close()
    }
    const onBlur = (): void => close()
    const onResize = (): void => close()
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('blur', onBlur)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('resize', onResize)
    }
  }, [menu, close])

  if (!menu) return null

  return (
    <div
      ref={ref}
      className="ctx-root"
      style={{ left: menu.x, top: menu.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuList items={menu.items} onAction={close} depth={0} />
    </div>
  )
}