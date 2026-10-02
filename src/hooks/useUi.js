/**
 * App-level navigation state. Lives outside the character store so any panel can jump to a tab
 * (e.g. "Open in 3D Studio" focusing a specific asset) without prop drilling.
 */

import { create } from 'zustand'

export const FULL_BLEED_TABS = ['chat', 'studio3d']

export const useUiStore = create((set) => ({
  currentTab: 'identity',
  sidebarOpen: true,
  /** { slot, outfitId, assetId, fileKey? } the Studio should select on its next render. */
  studioFocus: null,

  setTab: (tab) => set({ currentTab: String(tab || 'identity') }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: !!open }),

  /** Select an asset in the 3D Studio and switch to it. */
  focusStudio: (target = null) =>
    set({
      currentTab: 'studio3d',
      studioFocus: target
        ? { slot: target.slot, outfitId: target.outfitId || null, assetId: target.assetId || null, fileKey: target.fileKey || null, nonce: Date.now() }
        : null,
    }),
  clearStudioFocus: () => set({ studioFocus: null }),
}))

export function isFullBleedTab(tab) {
  return FULL_BLEED_TABS.includes(tab)
}
