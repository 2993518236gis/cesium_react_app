import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

const CesiumViewer = () => {
  // DOM容器
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Cesium实例
  const viewerRef = useRef<Cesium.Viewer | null>(null)

  // 当useEffect依赖为空数组，则只在组件挂载时执行一次
  useEffect(() => {
    if (!containerRef.current) return

    Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYTU0OGVmMi0xZTg0LTRiNDItOWJlMC1lZTgzMTEyNjcxMzYiLCJpZCI6MTE0Mzc5LCJpYXQiOjE2NjgwNTk1NzF9.ALtycYCCMTJS-CT758sxf2FWYfZOV1dAIJrkLu9E5xo"

    viewerRef.current = new Cesium.Viewer(containerRef.current, {
      animation: false,
      timeline: false,
      baseLayerPicker: true,
      // 加载全球真实地形数据
      terrain:Cesium.Terrain.fromWorldTerrain({
        requestVertexNormals:true,   // 光照更真实
        requestWaterMask:true        // 水面效果
      })
    })

    // 开启地形深度检测（depthTestAgainstTerrain）防止模型被遮挡  模型不会穿进山里
    viewerRef.current.scene.globe.depthTestAgainstTerrain = true;

    (viewerRef.current.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';

    // 设置默认视角（中国）
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.39, 39.9, 20000000)
    })

    return () => {
      viewerRef.current?.destroy()   // 组件卸载时执行（防止内存泄漏）
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ display:'flex',flexDirection:'column',height:'100%', position:'relative',overflow:'hidden' }}
    />
  )
}

export default CesiumViewer