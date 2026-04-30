import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import { useDrawStore, type DrawMode } from '../store/drawStore'
import { useLayerStore } from '../store/layerStore'
import {
  loadShapes, saveShapes, cartesian3ToCoord, coordToCartesian3,
  type StoredShape,
} from '../utils/shapeStorage'

function getPickPosition(viewer: Cesium.Viewer, position: Cesium.Cartesian2) {
  const scene = viewer.scene
  if (scene.pickPositionSupported) {
    const picked = scene.pick(position)
    if (Cesium.defined(picked)) {
      const cartesian = scene.pickPosition(position)
      if (Cesium.defined(cartesian)) return cartesian
    }
  }
  const ray = viewer.camera.getPickRay(position)
  if (ray) return scene.globe.pick(ray, scene)
  return undefined
}

export function useDrawHandler(viewerRef: React.RefObject<Cesium.Viewer | null>) {
  const { drawMode, setDrawMode, setHasTempShape } = useDrawStore()
  const { addDrawLayer } = useLayerStore()
  const drawModeRef = useRef<DrawMode>('none')
  const [viewerReady, setViewerReady] = useState(false)

  // 同步 store → ref
  useEffect(() => {
    drawModeRef.current = drawMode
  }, [drawMode])

  // 供 CesiumViewer 调用，通知 viewer 已就绪
  const notifyViewerReady = () => setViewerReady(true)

  // 临时绘制状态（纯 ref，不触发渲染）    
  // tempPositions = 当前绘制过程中用户已经点击的所有顶点，是动态绘制（线/面）的核心数据源。
  const tempPositions = useRef<Cesium.Cartesian3[]>([])
  const tempEntity = useRef<Cesium.Entity | null>(null)
  const tempPointEntities = useRef<Cesium.Entity[]>([])
  const mousePosRef = useRef<Cesium.Cartesian3 | null>(null)
  const savedIds = useRef<string[]>([])
  const storedShapes = useRef<StoredShape[]>(loadShapes())

  const cancelTemp = () => {
    const viewer = viewerRef.current
    if (!viewer) return
    if (tempEntity.current) {
      viewer.entities.remove(tempEntity.current)
      tempEntity.current = null
    }
    tempPointEntities.current.forEach(e => viewer.entities.remove(e))
    tempPointEntities.current = []
    tempPositions.current = []
    mousePosRef.current = null
    setHasTempShape(false)
  }

  const setMode = (mode: DrawMode) => {
    drawModeRef.current = mode
    setDrawMode(mode)
    cancelTemp()
  }

  const handleClear = () => {
    const viewer = viewerRef.current
    if (!viewer) return
    cancelTemp()
    savedIds.current.forEach(id => {
      const e = viewer.entities.getById(id)
      if (e) viewer.entities.remove(e)
    })
    savedIds.current = []
    storedShapes.current = []
    saveShapes([])
    setMode('none')
  }

  // 注册/注销 Cesium 事件
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed() || !viewerReady) return

    // 恢复 localStorage 中已保存的图形
    storedShapes.current.forEach(shape => {
      const positions = shape.coordinates.map(coordToCartesian3)
      let entity: Cesium.Entity
      if (shape.type === 'point') {
        entity = viewer.entities.add({
          position: positions[0],
          point: { pixelSize: 10, color: Cesium.Color.RED, outlineColor: Cesium.Color.WHITE, outlineWidth: 2, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND },
        })
      } else if (shape.type === 'polyline') {
        entity = viewer.entities.add({
          polyline: { positions, width: 3, material: new Cesium.ColorMaterialProperty(Cesium.Color.CYAN.withAlpha(0.9)), clampToGround: true },
        })
      } else {
        entity = viewer.entities.add({
          polygon: { hierarchy: new Cesium.PolygonHierarchy(positions), material: Cesium.Color.ORANGE.withAlpha(0.4), outline: true, outlineColor: Cesium.Color.ORANGE },
        })
      }
      savedIds.current.push(entity.id)
    })

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    const addTempPoint = (pos: Cesium.Cartesian3) => {
      const e = viewer.entities.add({
        position: pos,
        point: {
          pixelSize: 7,
          color: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      })
      tempPointEntities.current.push(e)
    }

    // 左键：添加顶点
    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const mode = drawModeRef.current
      if (mode === 'none') return
      const pos = getPickPosition(viewer, e.position)
      if (!pos) return

      if (mode === 'point') {
        const entity = viewer.entities.add({
          position: pos,
          point: {
            pixelSize: 10,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
        })
        savedIds.current.push(entity.id)
        const shape: StoredShape = { type: 'point', coordinates: [cartesian3ToCoord(pos)] }
        storedShapes.current.push(shape)
        saveShapes(storedShapes.current)
        addDrawLayer(`点 ${new Date().toLocaleTimeString()}`, [entity.id])
        return
      }

      tempPositions.current.push(pos)
      addTempPoint(pos)

      if (mode === 'polyline') {
        if (!tempEntity.current) {
          tempEntity.current = viewer.entities.add({
            polyline: {
              positions: new Cesium.CallbackProperty(() => {
                const pts = tempPositions.current
                const mouse = mousePosRef.current
                if (pts.length === 0) return []
                return mouse ? [...pts, mouse] : [...pts]
              }, false),
              width: 3,
              material: new Cesium.ColorMaterialProperty(Cesium.Color.CYAN.withAlpha(0.9)),
              clampToGround: true,
            },
          })
        }
        if (tempPositions.current.length >= 2) setHasTempShape(true)
      }

      if (mode === 'polygon') {
        if (!tempEntity.current) {
          tempEntity.current = viewer.entities.add({
            polyline: {
              positions: new Cesium.CallbackProperty(() => {
                const pts = tempPositions.current
                const mouse = mousePosRef.current
                if (pts.length === 0) return []
                return mouse ? [...pts, mouse] : [...pts]
              }, false),
              width: 2,
              material: new Cesium.ColorMaterialProperty(Cesium.Color.ORANGE.withAlpha(0.8)),
              clampToGround: true,
            },
            polygon: {
              hierarchy: new Cesium.CallbackProperty(() => {
                const pts = tempPositions.current
                const mouse = mousePosRef.current
                if (pts.length < 2) return new Cesium.PolygonHierarchy([])
                const all = mouse ? [...pts, mouse] : [...pts]
                return new Cesium.PolygonHierarchy(all)
              }, false),
              material: Cesium.Color.ORANGE.withAlpha(0.3),
              outline: false,
            },
          })
        }
        if (tempPositions.current.length >= 3) setHasTempShape(true)
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // 鼠标移动：更新预览终点
    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      const mode = drawModeRef.current
      if (mode !== 'polyline' && mode !== 'polygon') return
      if (tempPositions.current.length === 0) return
      const pos = getPickPosition(viewer, e.endPosition)
      mousePosRef.current = pos ?? null
      viewer.scene.requestRender()    // 手动触发一次渲染（只渲染一帧）
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    // 右键：完成并保存，继续绘制下一个
    handler.setInputAction(() => {
      const mode = drawModeRef.current
      if (mode !== 'polyline' && mode !== 'polygon') return
      const minPts = mode === 'polyline' ? 2 : 3
      if (tempPositions.current.length < minPts) {
        cancelTemp()
        return
      }
      if (tempEntity.current) {
        viewer.entities.remove(tempEntity.current)
        tempEntity.current = null
      }
      const finalPositions = [...tempPositions.current]
      let savedEntity: Cesium.Entity
      if (mode === 'polyline') {
        savedEntity = viewer.entities.add({
          polyline: {
            positions: finalPositions,
            width: 3,
            material: new Cesium.ColorMaterialProperty(Cesium.Color.CYAN.withAlpha(0.9)),
            clampToGround: true,
          },
        })
      } else {
        savedEntity = viewer.entities.add({
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(finalPositions),
            material: Cesium.Color.ORANGE.withAlpha(0.4),
            outline: true,
            outlineColor: Cesium.Color.ORANGE,
          },
        })
      }
      savedIds.current.push(savedEntity.id)
      const vertexIds = tempPointEntities.current.map(e => e.id)
      tempPointEntities.current.forEach(e => savedIds.current.push(e.id))
      tempPointEntities.current = []
      tempPositions.current = []
      mousePosRef.current = null
      setHasTempShape(false)
      // 持久化到 localStorage
      const shape: StoredShape = { type: mode, coordinates: finalPositions.map(cartesian3ToCoord) }
      storedShapes.current.push(shape)
      saveShapes(storedShapes.current)
      // 保存到图层
      const layerName = mode === 'polyline'
        ? `线 ${new Date().toLocaleTimeString()}`
        : `面 ${new Date().toLocaleTimeString()}`
      addDrawLayer(layerName, [savedEntity.id, ...vertexIds])
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

    return () => handler.destroy()
  }, [viewerReady])

  return { setMode, handleClear, notifyViewerReady, savedIds }
}
