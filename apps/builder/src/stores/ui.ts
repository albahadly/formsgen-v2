// Ephemeral workspace UI state (never part of the schema or history).

import { defineStore } from 'pinia'

export type ViewMode = 'editor' | 'preview' | 'code'
export type Device = 'mobile' | 'tablet' | 'desktop'
export type PreviewTheme = 'light' | 'dark'

export const DEVICE_WIDTHS: Record<Device, string> = {
  mobile: '375px',
  tablet: '768px',
  desktop: '100%',
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    viewMode: 'editor' as ViewMode,
    device: 'desktop' as Device,
    previewTheme: 'light' as PreviewTheme,
    showSettings: false,
  }),
  getters: {
    deviceWidth: (state) => DEVICE_WIDTHS[state.device],
  },
  actions: {
    setViewMode(mode: ViewMode): void {
      this.viewMode = mode
    },
    setDevice(device: Device): void {
      this.device = device
    },
    togglePreviewTheme(): void {
      this.previewTheme = this.previewTheme === 'light' ? 'dark' : 'light'
    },
    openSettings(): void {
      this.showSettings = true
    },
    closeSettings(): void {
      this.showSettings = false
    },
  },
})
