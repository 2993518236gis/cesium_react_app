import { create } from 'zustand'

export type MeasureMode = 'none' | 'distance' | 'area'

interface MeasureState {
  measureMode: MeasureMode
  setMeasureMode: (mode: MeasureMode) => void
}

export const useMeasureStore = create<MeasureState>((set) => ({
  measureMode: 'none',
  setMeasureMode: (mode) => set({ measureMode: mode }),
}))
