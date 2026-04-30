import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import { useAnnotationStore, type Annotation, type AnnotationMode } from '../store/annotationStore'

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

/** 根据标注数据构建 Cesium entity 配置 */
function buildEntityOptions(a: Annotation): Cesium.Entity.ConstructorOptions {
  const pos = Cesium.Cartesian3.fromDegrees(a.lng, a.lat, a.height)
  const color = a.color ? Cesium.Color.fromCssColorString(a.color) : Cesium.Color.DODGERBLUE

  if (a.type === 'pin') {
    return {
      id: a.id,
      position: pos,
      billboard: {
        image: createPinCanvas(color),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        width: 32,
        height: 44,
      },
      label: {
        text: a.text,
        font: '13px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -48),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        showBackground: true,
        backgroundColor: new Cesium.Color(0, 0, 0, 0.6),
        backgroundPadding: new Cesium.Cartesian2(6, 4),
      },
    }
  }

  if (a.type === 'label') {
    return {
      id: a.id,
      position: pos,
      label: {
        text: a.text,
        font: 'bold 15px sans-serif',
        fillColor: color,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -4),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        showBackground: true,
        backgroundColor: new Cesium.Color(0, 0, 0, 0.55),
        backgroundPadding: new Cesium.Cartesian2(8, 5),
      },
    }
  }

  // marker
  return {
    id: a.id,
    position: pos,
    billboard: {
      image: createEmojiCanvas(a.icon ?? '📍'),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      width: 40,
      height: 40,
    },
    label: {
      text: a.text,
      font: '13px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -46),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      showBackground: true,
      backgroundColor: new Cesium.Color(0, 0, 0, 0.6),
      backgroundPadding: new Cesium.Cartesian2(6, 4),
    },
  }
}

function createPinCanvas(color: Cesium.Color): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 32; canvas.height = 44
  const ctx = canvas.getContext('2d')!
  const [r, g, b] = [color.red * 255, color.green * 255, color.blue * 255]
  ctx.fillStyle = `rgb(${r},${g},${b})`
  ctx.beginPath()
  ctx.arc(16, 16, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = `rgb(${r},${g},${b})`
  ctx.beginPath()
  ctx.moveTo(10, 26); ctx.lineTo(22, 26); ctx.lineTo(16, 42)
  ctx.closePath(); ctx.fill()
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.arc(16, 16, 6, 0, Math.PI * 2)
  ctx.fill()
  return canvas
}

function createEmojiCanvas(emoji: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 40; canvas.height = 40
  const ctx = canvas.getContext('2d')!
  ctx.font = '30px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, 20, 22)
  return canvas
}

export function useAnnotationHandler(viewerRef: React.RefObject<Cesium.Viewer | null>) {
  const store = useAnnotationStore()
  const modeRef = useRef<AnnotationMode>('none')
  const [viewerReady, setViewerReady] = useState(false)
  // entityId → annotationId 映射（entity.id 就是 annotation.id）
  const entityMap = useRef<Map<string, string>>(new Map())

  useEffect(() => { modeRef.current = store.mode }, [store.mode])

  const notifyViewerReady = () => setViewerReady(true)

  // viewer 就绪后：加载历史标注 + 注册事件
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed() || !viewerReady) return

    store.loadFromStorage()
  }, [viewerReady])

  // 监听 annotations 变化，同步到 Cesium entities
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    const currentIds = new Set(store.annotations.map(a => a.id))

    // 删除已移除的 entity
    entityMap.current.forEach((_, entityId) => {
      if (!currentIds.has(entityId)) {
        const e = viewer.entities.getById(entityId)
        if (e) viewer.entities.remove(e)
        entityMap.current.delete(entityId)
      }
    })

    // 新增或更新 entity
    store.annotations.forEach(a => {
      const existing = viewer.entities.getById(a.id)
      if (existing) {
        // 更新：移除重建（最简单可靠）
        viewer.entities.remove(existing)
      }
      viewer.entities.add(buildEntityOptions(a))
      entityMap.current.set(a.id, a.id)
    })

    viewer.scene.requestRender()
  }, [store.annotations])

  // 注册鼠标事件
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed() || !viewerReady) return

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    // 左键：新建标注 或 选中已有标注
    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const mode = modeRef.current

      // 先检查是否点击了已有标注
      const picked = viewer.scene.pick(e.position)
      if (Cesium.defined(picked) && picked.id instanceof Cesium.Entity) {
        const entityId = picked.id.id
        if (entityMap.current.has(entityId)) {
          store.setEditingId(entityId)
          store.setMode('none')
          return
        }
      }

      if (mode === 'none') return
      const pos = getPickPosition(viewer, e.position)
      if (!pos) return
      const carto = Cesium.Cartographic.fromCartesian(pos)
      store.setPendingPos({
        lng: Cesium.Math.toDegrees(carto.longitude),
        lat: Cesium.Math.toDegrees(carto.latitude),
        height: carto.height,
      })
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    return () => handler.destroy()
  }, [viewerReady])

  return { notifyViewerReady }
}
