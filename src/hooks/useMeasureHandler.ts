import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import { useMeasureStore, type MeasureMode } from '../store/measureStore'

function getPickPosition(viewer: Cesium.Viewer, position: Cesium.Cartesian2) {
  const scene = viewer.scene
  if (scene.pickPositionSupported) {
    const picked = scene.pick(position)
    if (Cesium.defined(picked)) {
      const c = scene.pickPosition(position)
      if (Cesium.defined(c)) return c
    }
  }
  const ray = viewer.camera.getPickRay(position)
  if (ray) return scene.globe.pick(ray, scene)
  return undefined
}

/** 两点间距离（米） */
function calcDistance(pts: Cesium.Cartesian3[]): number {
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    total += Cesium.Cartesian3.distance(pts[i - 1], pts[i])
  }
  return total
}

/** 球面多边形面积（平方米），向量叉积近似 */
function calcArea(pts: Cesium.Cartesian3[]): number {
  if (pts.length < 3) return 0
  const R = 6378137
  let total = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const ca = Cesium.Cartographic.fromCartesian(a)
    const cb = Cesium.Cartographic.fromCartesian(b)
    total += (cb.longitude - ca.longitude) * (2 + Math.sin(ca.latitude) + Math.sin(cb.latitude))
  }
  return Math.abs(total * R * R / 2)
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(1)} m`
}

function formatArea(m2: number): string {
  return m2 >= 1e6 ? `${(m2 / 1e6).toFixed(4)} km²` : `${m2.toFixed(1)} m²`
}

/** 多点重心 */
function centroid(pts: Cesium.Cartesian3[]): Cesium.Cartesian3 {
  const sum = pts.reduce((acc, p) => Cesium.Cartesian3.add(acc, p, new Cesium.Cartesian3()), new Cesium.Cartesian3())
  return Cesium.Cartesian3.divideByScalar(sum, pts.length, new Cesium.Cartesian3())
}

function makeLabelEntity(viewer: Cesium.Viewer, pos: Cesium.Cartesian3, text: string): Cesium.Entity {
  return viewer.entities.add({
    position: pos,
    label: {
      text,
      font: '14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -8),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}

export function useMeasureHandler(viewerRef: React.RefObject<Cesium.Viewer | null>) {
  const { measureMode, setMeasureMode } = useMeasureStore()
  const measureModeRef = useRef<MeasureMode>('none')
  const [viewerReady, setViewerReady] = useState(false)

  useEffect(() => { measureModeRef.current = measureMode }, [measureMode])

  const notifyViewerReady = () => setViewerReady(true)

  // 当前正在绘制的临时状态
  const tempPts = useRef<Cesium.Cartesian3[]>([])
  const tempEntities = useRef<Cesium.Entity[]>([])   // 顶点点 + 预览线/面
  const previewEntity = useRef<Cesium.Entity | null>(null)
  const previewLabelEntity = useRef<Cesium.Entity | null>(null)
  const mousePosRef = useRef<Cesium.Cartesian3 | null>(null)

  // 已完成的测量 entity（可批量清除）
  const resultEntities = useRef<Cesium.Entity[]>([])

  const clearTemp = () => {
    const viewer = viewerRef.current
    if (!viewer) return
    tempEntities.current.forEach(e => viewer.entities.remove(e))
    tempEntities.current = []
    if (previewEntity.current) { viewer.entities.remove(previewEntity.current); previewEntity.current = null }
    if (previewLabelEntity.current) { viewer.entities.remove(previewLabelEntity.current); previewLabelEntity.current = null }
    tempPts.current = []
    mousePosRef.current = null
  }

  const setMeasure = (mode: MeasureMode) => {
    measureModeRef.current = mode
    setMeasureMode(mode)
    clearTemp()
  }

  const clearAll = () => {
    clearTemp()
    const viewer = viewerRef.current
    if (!viewer) return
    resultEntities.current.forEach(e => viewer.entities.remove(e))
    resultEntities.current = []
    setMeasure('none')
  }

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed() || !viewerReady) return

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    const addVertex = (pos: Cesium.Cartesian3) => {
      const e = viewer.entities.add({
        position: pos,
        point: { pixelSize: 6, color: Cesium.Color.YELLOW, outlineColor: Cesium.Color.WHITE, outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      })
      tempEntities.current.push(e)
    }

    // 左键：添加顶点
    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const mode = measureModeRef.current
      if (mode === 'none') return
      const pos = getPickPosition(viewer, e.position)
      if (!pos) return

      tempPts.current.push(pos)
      addVertex(pos)

      // 首次点击时创建动态预览 entity
      if (!previewEntity.current) {
        if (mode === 'distance') {
          previewEntity.current = viewer.entities.add({
            polyline: {
              positions: new Cesium.CallbackProperty(() => {
                const pts = tempPts.current
                const mouse = mousePosRef.current
                if (pts.length === 0) return []
                return mouse ? [...pts, mouse] : [...pts]
              }, false),
              width: 2,
              material: new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.YELLOW }),
              clampToGround: true,
            },
          })
        } else {
          previewEntity.current = viewer.entities.add({
            polyline: {
              positions: new Cesium.CallbackProperty(() => {
                const pts = tempPts.current
                const mouse = mousePosRef.current
                if (pts.length === 0) return []
                return mouse ? [...pts, mouse] : [...pts]
              }, false),
              width: 2,
              material: new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.LIME }),
              clampToGround: true,
            },
            polygon: {
              hierarchy: new Cesium.CallbackProperty(() => {
                const pts = tempPts.current
                const mouse = mousePosRef.current
                if (pts.length < 2) return new Cesium.PolygonHierarchy([])
                return new Cesium.PolygonHierarchy(mouse ? [...pts, mouse] : [...pts])
              }, false),
              material: Cesium.Color.LIME.withAlpha(0.15),
              outline: false,
            },
          })
        }
      }

      // 实时更新预览 label
      const updatePreviewLabel = () => {
        if (previewLabelEntity.current) {
          viewer.entities.remove(previewLabelEntity.current)
          previewLabelEntity.current = null
        }
        const pts = tempPts.current
        if (mode === 'distance' && pts.length >= 2) {
          const mid = Cesium.Cartesian3.midpoint(pts[pts.length - 2], pts[pts.length - 1], new Cesium.Cartesian3())
          previewLabelEntity.current = makeLabelEntity(viewer, mid, formatDistance(calcDistance(pts)))
        }
      }
      updatePreviewLabel()
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // 鼠标移动：更新预览
    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      const mode = measureModeRef.current
      if (mode === 'none' || tempPts.current.length === 0) return
      const pos = getPickPosition(viewer, e.endPosition)
      mousePosRef.current = pos ?? null
      viewer.scene.requestRender()
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    // 右键：完成测量，显示最终结果
    handler.setInputAction(() => {
      const mode = measureModeRef.current
      if (mode === 'none') return
      const pts = [...tempPts.current]
      const minPts = mode === 'distance' ? 2 : 3
      if (pts.length < minPts) { clearTemp(); return }

      clearTemp()

      if (mode === 'distance') {
        // 绘制最终线
        const lineEntity = viewer.entities.add({
          polyline: {
            positions: pts,
            width: 2,
            material: new Cesium.ColorMaterialProperty(Cesium.Color.YELLOW.withAlpha(0.9)),
            clampToGround: true,
          },
        })
        resultEntities.current.push(lineEntity)
        // 每段距离 label
        for (let i = 1; i < pts.length; i++) {
          const segDist = Cesium.Cartesian3.distance(pts[i - 1], pts[i])
          const mid = Cesium.Cartesian3.midpoint(pts[i - 1], pts[i], new Cesium.Cartesian3())
          const lbl = makeLabelEntity(viewer, mid, formatDistance(segDist))
          resultEntities.current.push(lbl)
        }
        // 总距离 label（终点处）
        const totalLbl = makeLabelEntity(viewer, pts[pts.length - 1], `总计: ${formatDistance(calcDistance(pts))}`)
        resultEntities.current.push(totalLbl)
        // 顶点
        pts.forEach(p => {
          const dot = viewer.entities.add({ position: p, point: { pixelSize: 6, color: Cesium.Color.YELLOW, outlineColor: Cesium.Color.WHITE, outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY } })
          resultEntities.current.push(dot)
        })
      } else {
        // 绘制最终面
        const polyEntity = viewer.entities.add({
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(pts),
            material: Cesium.Color.LIME.withAlpha(0.25),
            outline: true,
            outlineColor: Cesium.Color.LIME,
          },
        })
        resultEntities.current.push(polyEntity)
        // 面积 label（重心）
        const areaLbl = makeLabelEntity(viewer, centroid(pts), formatArea(calcArea(pts)))
        resultEntities.current.push(areaLbl)
        // 顶点
        pts.forEach(p => {
          const dot = viewer.entities.add({ position: p, point: { pixelSize: 6, color: Cesium.Color.LIME, outlineColor: Cesium.Color.WHITE, outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY } })
          resultEntities.current.push(dot)
        })
      }

      viewer.scene.requestRender()
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

    return () => handler.destroy()
  }, [viewerReady])

  return { setMeasure, clearAll, notifyViewerReady }
}
