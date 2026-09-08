/// <reference types="vite/client" />
import type { SnjyApi } from '@shared/ipc'

declare global {
  interface Window {
    snjy: SnjyApi
  }
}

export {}