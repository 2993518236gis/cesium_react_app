import { create } from 'zustand'

export type LayerType = 'draw'

export interface Layer {
  id: string
  name: string
  type: LayerType
  group: string
  visible: boolean      // 控制显示隐藏
  order: number         // 渲染顺序
  entityIds?: string[]  // 绑定 Cesium Entity
}

interface LayerState {
  layers: Layer[]
  addDrawLayer: (name: string, entityIds: string[]) => void
  removeLayer: (id: string) => void
  updateLayer: (id: string, patch: Partial<Layer>) => void
}

// create创建一个全局store useLayerStore：ReactHook,用来在组件中访问状态和更新状态
// 用 Zustand 管理图层状态，并通过 entityIds 关联 Cesium 渲染对象
export const useLayerStore = create<LayerState>((set, get) => ({
  layers: [],

  addDrawLayer: (name, entityIds) => {
    const layers = get().layers
    const maxOrder = layers.reduce((m, l) => Math.max(m, l.order), -1)    //求最大值 图层层级，保证新图层在最上面
    const newLayer: Layer = {
      id: `draw-${Date.now()}`,
      name,
      type: 'draw',
      group: '绘制图层',
      visible: true,
      order: maxOrder + 1,
      entityIds,
    }
    set({ layers: [...layers, newLayer] })
  },

  removeLayer: (id) => {
    set({ layers: get().layers.filter(l => l.id !== id) })
  },

  updateLayer: (id, patch) => {
    set({ layers: get().layers.map(l => l.id === id ? { ...l, ...patch } : l) })
  },
}))
