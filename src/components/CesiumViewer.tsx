import { useEffect, useRef, useState, useCallback } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { useDrawStore } from '../store/drawStore'
import { useDrawHandler } from '../hooks/useDrawHandler'
import { useMeasureStore } from '../store/measureStore'
import { useMeasureHandler } from '../hooks/useMeasureHandler'
import { useAnnotationStore } from '../store/annotationStore'
import { useAnnotationHandler } from '../hooks/useAnnotationHandler'
import { useLayerManager } from '../hooks/useLayerManager'
import AnnotationPanel from './AnnotationPanel'
import LayerPanel from './LayerPanel'

const TOOLBAR_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  zIndex: 100,
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  background: 'rgba(30,30,40,0.85)',
  padding: '8px 12px',
  borderRadius: 8,
  boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
  flexWrap: 'wrap',
  maxWidth: 'calc(100vw - 32px)',
}

const divider: React.CSSProperties = {
  width: 1, height: 20, background: '#444', margin: '0 4px',
}

const btnStyle = (active: boolean, color = '#4fc3f7'): React.CSSProperties => ({
  padding: '5px 14px',
  borderRadius: 5,
  border: active ? `2px solid ${color}` : '1px solid #555',
  background: active ? '#1a3a4a' : '#23232e',
  color: active ? color : '#ccc',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  transition: 'all 0.15s',
})

const label12: React.CSSProperties = { color: '#888', fontSize: 12 }

const MAP_TOOLBAR_STYLE: React.CSSProperties = {
  position: 'absolute',
  right: 16,
  bottom: 80,
  zIndex: 100,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  background: 'rgba(30,30,40,0.85)',
  padding: '8px',
  borderRadius: 8,
  boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
}

const iconBtn = (title: string, onClick: () => void, content: string): React.ReactElement => (
  <button
    key={title}
    title={title}
    onClick={onClick}
    style={{
      width: 36, height: 36,
      borderRadius: 5,
      border: '1px solid #555',
      background: '#23232e',
      color: '#ccc',
      cursor: 'pointer',
      fontSize: 16,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = '#2a3a4a')}
    onMouseLeave={e => (e.currentTarget.style.background = '#23232e')}
  >
    {content}
  </button>
)

const CesiumViewer = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)

  const { drawMode, hasTempShape } = useDrawStore()
  const { measureMode } = useMeasureStore()
  const annStore = useAnnotationStore()

  const { setMode: setDrawMode, handleClear: handleDrawClear, notifyViewerReady: notifyDrawReady } = useDrawHandler(viewerRef)
  const { setMeasure, clearAll: clearMeasure, notifyViewerReady: notifyMeasureReady } = useMeasureHandler(viewerRef)
  const { notifyViewerReady: notifyAnnotationReady } = useAnnotationHandler(viewerRef)
  const { notifyViewerReady: notifyLayerReady } = useLayerManager(viewerRef)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showLayerPanel, setShowLayerPanel] = useState(false)

  // 放大
  const handleZoomIn = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const cam = viewer.camera
    cam.zoomIn(cam.positionCartographic.height * 0.4)
    viewer.scene.requestRender()
  }, [])

  // 缩小
  const handleZoomOut = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const cam = viewer.camera
    cam.zoomOut(cam.positionCartographic.height * 0.6)
    viewer.scene.requestRender()
  }, [])

  // 复位视角
  const handleReset = useCallback(() => {
    viewerRef.current?.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.39, 39.9, 20000000),
      duration: 1.5,
    })
  }, [])

  // 全屏
  const handleFullscreen = useCallback(() => {
    const el = containerRef.current?.parentElement
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true))
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false))
    }
  }, [])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // 截图
  const handleScreenshot = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.scene.requestRender()
    // 等下一帧渲染完成后截图
    viewer.scene.postRender.addEventListener(function capture() {
      viewer.scene.postRender.removeEventListener(capture)
      const canvas = viewer.scene.canvas
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `screenshot-${Date.now()}.png`
      a.click()
    })
    viewer.scene.requestRender()
  }, [])

  const exitOthers = (except: 'draw' | 'measure' | 'annotation') => {
    if (except !== 'draw' && drawMode !== 'none') setDrawMode('none')
    if (except !== 'measure' && measureMode !== 'none') setMeasure('none')
    if (except !== 'annotation' && annStore.mode !== 'none') annStore.setMode('none')  // 标注
  }

  const handleDrawMode = (mode: typeof drawMode) => {
    exitOthers('draw')
    setDrawMode(drawMode === mode ? 'none' : mode)
  }

  const handleMeasureMode = (mode: typeof measureMode) => {
    exitOthers('measure')
    setMeasure(measureMode === mode ? 'none' : mode)
  }

  const handleAnnotationMode = (mode: 'pin' | 'label' | 'marker') => {
    exitOthers('annotation')
    annStore.setMode(annStore.mode === mode ? 'none' : mode)
  }

  useEffect(() => {
    if (!containerRef.current) return

    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYTU0OGVmMi0xZTg0LTRiNDItOWJlMC1lZTgzMTEyNjcxMzYiLCJpZCI6MTE0Mzc5LCJpYXQiOjE2NjgwNTk1NzF9.ALtycYCCMTJS-CT758sxf2FWYfZOV1dAIJrkLu9E5xo'

    viewerRef.current = new Cesium.Viewer(containerRef.current, {
      animation: false, timeline: false, baseLayerPicker: false,
      geocoder: false, homeButton: false, navigationHelpButton: false, sceneModePicker: false,
      terrain: Cesium.Terrain.fromWorldTerrain({ requestVertexNormals: false, requestWaterMask: false }),
    })

    viewerRef.current.scene.globe.depthTestAgainstTerrain = true
    ;(viewerRef.current.cesiumWidget.creditContainer as HTMLElement).style.display = 'none'
    viewerRef.current.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(116.39, 39.9, 20000000) })
    viewerRef.current.scene.requestRenderMode = true

    notifyDrawReady()
    notifyMeasureReady()
    notifyAnnotationReady()
    notifyLayerReady()

    return () => {
      viewerRef.current?.destroy()
      viewerRef.current = null
    }
  }, [])

  const showCreatePanel = annStore.pendingPos !== null
  const showEditPanel = annStore.editingId !== null

  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div style={TOOLBAR_STYLE}>
        {/* 绘制 */}
        <span style={label12}>绘制</span>
        <button style={btnStyle(drawMode === 'point')} onClick={() => handleDrawMode('point')}>点</button>
        <button style={btnStyle(drawMode === 'polyline')} onClick={() => handleDrawMode('polyline')}>线</button>
        <button style={btnStyle(drawMode === 'polygon')} onClick={() => handleDrawMode('polygon')}>面</button>
        {hasTempShape && <button style={btnStyle(false)} onClick={() => setDrawMode('none')}>取消</button>}
        <button style={{ ...btnStyle(false), color: '#f88', borderColor: '#f44' }} onClick={handleDrawClear}>清除</button>

        <div style={divider} />

        {/* 测量 */}
        <span style={label12}>测量</span>
        <button style={btnStyle(measureMode === 'distance', '#ffd54f')} onClick={() => handleMeasureMode('distance')}>📏 距离</button>
        <button style={btnStyle(measureMode === 'area', '#a5d6a7')} onClick={() => handleMeasureMode('area')}>📐 面积</button>
        <button style={{ ...btnStyle(false), color: '#f88', borderColor: '#f44' }} onClick={clearMeasure}>清除</button>

        <div style={divider} />

        {/* 标注 */}
        <span style={label12}>标注</span>
        <button style={btnStyle(annStore.mode === 'pin', '#ce93d8')} onClick={() => handleAnnotationMode('pin')}>📌 点标注</button>
        <button style={btnStyle(annStore.mode === 'label', '#80cbc4')} onClick={() => handleAnnotationMode('label')}>🔤 文本</button>
        <button style={btnStyle(annStore.mode === 'marker', '#ffcc80')} onClick={() => handleAnnotationMode('marker')}>🗺️ 图标</button>
        {annStore.annotations.length > 0 && (
          <button style={{ ...btnStyle(false), color: '#f88', borderColor: '#f44' }} onClick={annStore.clearAll}>清除</button>
        )}

        <div style={divider} />

        {/* 图层 */}
        <button style={btnStyle(showLayerPanel, '#b0bec5')} onClick={() => setShowLayerPanel(v => !v)}>🗂️ 图层</button>
      </div>

      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* 地图工具栏 */}
      <div style={MAP_TOOLBAR_STYLE}>
        {iconBtn('放大', handleZoomIn, '+')}
        {iconBtn('缩小', handleZoomOut, '−')}
        <div style={{ height: 1, background: '#444', margin: '2px 0' }} />
        {iconBtn('复位视角', handleReset, '⌂')}
        {iconBtn(isFullscreen ? '退出全屏' : '全屏', handleFullscreen, isFullscreen ? '🗗' : '🗖')}
        {iconBtn('截图', handleScreenshot, '📷')}
      </div>

      {showCreatePanel && <AnnotationPanel mode="create" />}
      {showEditPanel && <AnnotationPanel mode="edit" />}
      {showLayerPanel && <LayerPanel onClose={() => setShowLayerPanel(false)} viewerRef={viewerRef} />}
    </div>
  )
}

export default CesiumViewer
