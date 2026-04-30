import { create } from 'zustand'

export type DrawMode = 'none' | 'point' | 'polyline' | 'polygon'

interface DrawState {
  drawMode: DrawMode
  hasTempShape: boolean
  setDrawMode: (mode: DrawMode) => void
  setHasTempShape: (v: boolean) => void
}

export const useDrawStore = create<DrawState>((set) => ({
  drawMode: 'none',
  hasTempShape: false,
  setDrawMode: (mode) => set({ drawMode: mode }),
  setHasTempShape: (v) => set({ hasTempShape: v }),
}))