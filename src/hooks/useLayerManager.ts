import { useRef } from 'react'
import * as Cesium from 'cesium'
import { useLayerStore } from '../store/layerStore'

export function useLayerManager(_viewerRef: React.RefObject<Cesium.Viewer | null>) {
  // 仅保留接口兼容，底图由 Cesium 默认管理
  const initialized = useRef(false)
  const { layers } = useLayerStore()
  void layers
  void initialized

  const notifyViewerReady = () => {}

  return { notifyViewerReady }
}
