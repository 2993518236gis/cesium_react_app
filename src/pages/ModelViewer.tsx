import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { List, Button, Space, Typography, Tag, Divider } from 'antd'
import { CarOutlined, RocketOutlined, EyeOutlined, AimOutlined } from '@ant-design/icons'

const { Text } = Typography

interface ModelItem {
  id: string
  name: string
  category: '汽车' | '飞机' | '直升机' | '船舶'
  url: string
  position: { lon: number; lat: number; alt: number }
  scale: number
  description: string
  clampToGround?: boolean
}

const MODELS: ModelItem[] = [
  {
    id: 'car-sedan',
    name: '牛奶卡车',
    category: '汽车',
    url: '/cesium/models/CesiumMilkTruck/CesiumMilkTruck.glb',
    position: { lon: 116.39, lat: 39.9, alt: 0 },
    scale: 3,
    description: 'Cesium 牛奶卡车模型（本地）',
    clampToGround: true
  },
  {
    id: 'aircraft-cesium',
    name: 'Cesium Air',
    category: '飞机',
    url: '/cesium/models/CesiumAir/Cesium_Air.glb',
    position: { lon: 116.42, lat: 39.92, alt: 1500 },
    scale: 2,
    description: 'Cesium 示例飞机模型'
  },
  {
    id: 'drone',
    name: '无人机',
    category: '直升机',
    url: '/cesium/models/CesiumDrone/CesiumDrone.glb',
    position: { lon: 116.36, lat: 39.88, alt: 500 },
    scale: 5,
    description: 'Cesium 示例无人机模型'
  },
  {
    id: 'ground-vehicle',
    name: '地面车辆',
    category: '汽车',
    url: '/cesium/models/GroundVehicle/GroundVehicle.glb',
    position: { lon: 116.38, lat: 39.87, alt: 0 },
    scale: 3,
    description: 'Cesium 示例地面车辆',
    clampToGround: true
  }
]

const CATEGORY_COLOR: Record<string, string> = {
  汽车: 'blue',
  飞机: 'green',
  直升机: 'orange',
  船舶: 'cyan'
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  汽车: <CarOutlined />,
  飞机: <RocketOutlined />,
  直升机: <RocketOutlined />,
  船舶: <RocketOutlined />
}

export default function ModelViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const entityMapRef = useRef<Map<string, Cesium.Entity>>(new Map())
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set())
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const viewer = new Cesium.Viewer(containerRef.current, {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      requestRenderMode: false
    })

    viewer.scene.globe.enableLighting = true
    ;(viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none'
    viewerRef.current = viewer

    // 飞到北京
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.39, 39.9, 8000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      },
      duration: 0
    })

    return () => {
      viewer.destroy()
      viewerRef.current = null
      entityMapRef.current.clear()
    }
  }, [])

  const loadModel = (model: ModelItem) => {
    const viewer = viewerRef.current
    if (!viewer) return

    // 已加载则直接定位
    if (loadedIds.has(model.id)) {
      flyToModel(model)
      return
    }

    setLoadingId(model.id)

    const entity = viewer.entities.add({
      name: model.name,
      position: Cesium.Cartesian3.fromDegrees(
        model.position.lon,
        model.position.lat,
        model.position.alt
      ),
      model: {
        uri: model.url,
        scale: model.scale,
        minimumPixelSize: 64,
        maximumScale: 20000,
        silhouetteColor: Cesium.Color.WHITE,
        silhouetteSize: 2,
        heightReference: model.clampToGround
          ? Cesium.HeightReference.CLAMP_TO_GROUND
          : Cesium.HeightReference.NONE
      },
      label: {
        text: model.name,
        font: '14px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    })

    entityMapRef.current.set(model.id, entity)
    setLoadedIds(prev => new Set(prev).add(model.id))
    setLoadingId(null)

    flyToModel(model)
  }

  const flyToModel = (model: ModelItem) => {
    const viewer = viewerRef.current
    if (!viewer) return

    const alt = model.position.alt > 100 ? model.position.alt + 2000 : 500
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        model.position.lon,
        model.position.lat,
        alt
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-30),
        roll: 0
      },
      duration: 1.5
    })
  }

  const removeModel = (model: ModelItem) => {
    const viewer = viewerRef.current
    if (!viewer) return

    const entity = entityMapRef.current.get(model.id)
    if (entity) {
      viewer.entities.remove(entity)
      entityMapRef.current.delete(model.id)
      setLoadedIds(prev => {
        const next = new Set(prev)
        next.delete(model.id)
        return next
      })
    }
  }

  const flyToOverview = () => {
    viewerRef.current?.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.39, 39.9, 8000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      },
      duration: 1.5
    })
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Cesium 容器 */}
      <div ref={containerRef} style={{ flex: 1, height: '100%' }} />

      {/* 侧边模型面板 */}
      <div style={{
        width: 260,
        height: '100%',
        background: 'rgba(20,24,36,0.95)',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Text strong style={{ color: '#fff', fontSize: 15 }}>3D 模型库</Text>
          <br />
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
            点击加载模型到地球
          </Text>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <List
            dataSource={MODELS}
            renderItem={item => {
              const loaded = loadedIds.has(item.id)
              const loading = loadingId === item.id
              return (
                <List.Item style={{
                  padding: '8px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer'
                }}>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Space size={6}>
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{CATEGORY_ICON[item.category]}</span>
                        <Text style={{ color: '#fff', fontSize: 13 }}>{item.name}</Text>
                      </Space>
                      <Tag color={CATEGORY_COLOR[item.category]} style={{ margin: 0, fontSize: 11 }}>
                        {item.category}
                      </Tag>
                    </div>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, display: 'block', marginBottom: 8 }}>
                      {item.description}
                    </Text>
                    <Space size={6}>
                      <Button
                        size="small"
                        type={loaded ? 'default' : 'primary'}
                        loading={loading}
                        icon={<EyeOutlined />}
                        onClick={() => loadModel(item)}
                        style={{ fontSize: 11 }}
                      >
                        {loaded ? '定位' : '加载'}
                      </Button>
                      {loaded && (
                        <Button
                          size="small"
                          danger
                          onClick={() => removeModel(item)}
                          style={{ fontSize: 11 }}
                        >
                          移除
                        </Button>
                      )}
                    </Space>
                  </div>
                </List.Item>
              )
            }}
          />
        </div>

        <Divider style={{ margin: '0', borderColor: 'rgba(255,255,255,0.08)' }} />
        <div style={{ padding: 12 }}>
          <Button
            block
            icon={<AimOutlined />}
            onClick={flyToOverview}
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none' }}
          >
            总览视角
          </Button>
        </div>
      </div>
    </div>
  )
}
