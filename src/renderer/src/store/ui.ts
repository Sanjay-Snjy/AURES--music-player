import { create } from 'zustand'
import type { ReactNode } from 'react'
import type { Track } from '@shared/ipc'

export interface Toast {
  id: number
  msg: string
  type: 'info' | 'success' | 'error'
}

export interface ContextMenuItem {
  label?: string
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  separator?: boolean
  onClick?: () => void
  submenu?: ContextMenuItem[]
}

export interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

export interface UiState {
  toasts: Toast[]
  contextMenu: ContextMenuState | null
  queueOpen: boolean
  miniMode: boolean
  searchOpen: boolean
  trackInfo: Track | null
  dropOverlay: boolean

  pushToast(msg: string, type?: Toast['type']): void
  dismissToast(id: number): void
  openContextMenu(x: number, y: number, items: ContextMenuItem[]): void
  closeContextMenu(): void
  setQueueOpen(v: boolean): void
  setMiniMode(v: boolean): void
  setSearchOpen(v: boolean): void
  setTrackInfo(t: Track | null): void
  setDropOverlay(v: boolean): void
}

let toastId = 1

export const useUi = create<UiState>((set) => ({
  toasts: [],
  contextMenu: null,
  queueOpen: false,
  miniMode: false,
  searchOpen: false,
  trackInfo: null,
  dropOverlay: false,

  pushToast(msg, type = 'info') {
    const id = toastId++
    set({ toasts: [...useUi.getState().toasts, { id, msg, type }] })
    setTimeout(() => {
      set({ toasts: useUi.getState().toasts.filter((t) => t.id !== id) })
    }, 3600)
  },

  dismissToast(id) {
    set({ toasts: useUi.getState().toasts.filter((t) => t.id !== id) })
  },

  openContextMenu(x, y, items) {
    set({ contextMenu: { x, y, items } })
  },

  closeContextMenu() {
    set({ contextMenu: null })
  },

  setQueueOpen(v) {
    set({ queueOpen: v })
  },

  setMiniMode(v) {
    set({ miniMode: v })
  },

  setSearchOpen(v) {
    set({ searchOpen: v })
  },

  setTrackInfo(t) {
    set({ trackInfo: t })
  },

  setDropOverlay(v) {
    set({ dropOverlay: v })
  }
}))

export function toast(msg: string, type: Toast['type'] = 'info'): void {
  useUi.getState().pushToast(msg, type)
}