import { create } from 'zustand'

export type AnnotationType = 'pin' | 'label' | 'marker'
export type AnnotationMode = 'none' | AnnotationType

export interface Annotation {
  id: string
  type: AnnotationType
  lng: number
  lat: number
  height: number
  text: string        // 标注名称 / 文本内容
  icon?: string       // marker 图标 emoji
  color?: string      // 颜色 hex
}

interface AnnotationState {
  mode: AnnotationMode
  annotations: Annotation[]
  editingId: string | null          // 正在编辑的标注 id
  pendingPos: { lng: number; lat: number; height: number } | null  // 待确认的新建位置

  setMode: (mode: AnnotationMode) => void
  setPendingPos: (pos: AnnotationState['pendingPos']) => void
  setEditingId: (id: string | null) => void
  addAnnotation: (a: Annotation) => void
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void
  removeAnnotation: (id: string) => void
  clearAll: () => void
  loadFromStorage: () => void
}

const LS_KEY = 'cesium-annotations'

function persist(annotations: Annotation[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(annotations))
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  mode: 'none',
  annotations: [],
  editingId: null,
  pendingPos: null,

  setMode: (mode) => set({ mode, pendingPos: null, editingId: null }),
  setPendingPos: (pos) => set({ pendingPos: pos }),
  setEditingId: (id) => set({ editingId: id }),

  addAnnotation: (a) => {
    const next = [...get().annotations, a]
    persist(next)
    set({ annotations: next, pendingPos: null })
  },

  updateAnnotation: (id, patch) => {
    const next = get().annotations.map(a => a.id === id ? { ...a, ...patch } : a)
    persist(next)
    set({ annotations: next, editingId: null })
  },

  removeAnnotation: (id) => {
    const next = get().annotations.filter(a => a.id !== id)
    persist(next)
    set({ annotations: next, editingId: null })
  },

  clearAll: () => {
    persist([])
    set({ annotations: [], editingId: null, pendingPos: null, mode: 'none' })
  },

  loadFromStorage: () => {
    try {
      const data = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as Annotation[]
      set({ annotations: data })
    } catch {
      set({ annotations: [] })
    }
  },
}))
