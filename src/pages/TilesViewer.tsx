import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { List, Button, Space, Typography, Tag, Divider, Badge } from 'antd'
import { DatabaseOutlined, EyeOutlined, AimOutlined, DeleteOutlined } from '@ant-design/icons'

const { Text } = Typography

interface TilesetItem {
  id: string
  name: string
  category: string
  url: string
  description: string
  // 用于飞行定位的经纬度（度），来自 tileset boundingVolume region（弧度转度）
  flyTo: { lon: number; lat: number; alt: number }
}

// 弧度转度辅助
const r2d = (r: number) => (r * 180) / Math.PI

const TILESETS: TilesetItem[] = [
  {
    id: 'tileset',
    name: 'Sample Tileset',
    category: 'Batched',
    url: '/cesium/Cesium3DTiles/Tilesets/Tileset/tileset.json',
    description: '多层级 b3dm 建筑示例',
    flyTo: { lon: r2d(-1.3197), lat: r2d(0.6989), alt: 200 }
  },
  {
    id: 'tileset-request-volume',
    name: 'Viewer Request Volume',
    category: 'Batched',
    url: '/cesium/Cesium3DTiles/Tilesets/TilesetWithViewerRequestVolume/tileset.json',
    description: '带视锥请求体的 Tileset',
    flyTo: { lon: r2d(-1.3197), lat: r2d(0.6989), alt: 200 }
  },
  {
    id: 'batched-colors',
    name: 'Batched Colors',
    category: 'Batched',
    url: '/cesium/Cesium3DTiles/Batched/BatchedColors/tileset.json',
    description: '批量彩色建筑',
    flyTo: { lon: r2d(-1.3197), lat: r2d(0.6989), alt: 150 }
  },
  {
    id: 'batched-translucent',
    name: 'Batched Translucent',
    category: 'Batched',
    url: '/cesium/Cesium3DTiles/Batched/BatchedTranslucent/tileset.json',
    description: '半透明建筑',
    flyTo: { lon: r2d(-1.3197), lat: r2d(0.6989), alt: 150 }
  },
  {
    id: 'batched-mix',
    name: 'Translucent + Opaque',
    category: 'Batched',
    url: '/cesium/Cesium3DTiles/Batched/BatchedTranslucentOpaqueMix/tileset.json',
    description: '半透明与不透明混合',
    flyTo: { lon: r2d(-1.3197), lat: r2d(0.6989), alt: 150 }
  },
  {
    id: 'batched-batchtable',
    name: 'With Batch Table',
    category: 'Batched',
    url: '/cesium/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json',
    description: '含属性表的批量模型',
    flyTo: { lon: r2d(-1.3197), lat: r2d(0.6989), alt: 150 }
  },
  {
    id: 'instanced-orientation',
    name: 'Instanced Orientation',
    category: 'Instanced',
    url: '/cesium/Cesium3DTiles/Instanced/InstancedOrientation/tileset.json',
    description: '带朝向的实例化模型',
    flyTo: { lon: r2d(-1.3197), lat: r2d(0.6989), alt: 150 }
  },
  {
    id: 'instanced-batchtable',
    name: 'Instanced Batch Table',
    category: 'Instanced',
    url: '/cesium/Cesium3DTiles/Instanced/InstancedWithBatchTable/tileset.json',
    description: '含属性表的实例化模型',
    flyTo: { lon: r2d(-1.3197), lat: r2d(0.6989), alt: 150 }
  },
  {
    id: 'pointcloud-rgb',
    name: 'Point Cloud RGB',
    category: 'PointCloud',
    url: '/cesium/Cesium3DTiles/PointCloud/PointCloudRGB/tileset.json',
    description: 'RGB 彩色点云',
    flyTo: { lon: r2d(1215012.88 / 6378137), lat: r2d(Math.atan2(4081605.22, Math.sqrt(1215012.88 ** 2 + 4736313.05 ** 2))), alt: 30 }
  },
  {
    id: 'pointcloud-normals',
    name: 'Point Cloud Normals',
    category: 'PointCloud',
    url: '/cesium/Cesium3DTiles/PointCloud/PointCloudNormals/tileset.json',
    description: '带法线的点云',
    flyTo: { lon: r2d(-1.3197), lat: r2d(0.6989), alt: 30 }
  },
  {
    id: 'pointcloud-draco',
    name: 'Point Cloud Draco',
    category: 'PointCloud',
    url: '/cesium/Cesium3DTiles/PointCloud/PointCloudDraco/tileset.json',
    description: 'Draco 压缩点云',
    flyTo: { lon: r2d(-1.3197), lat: r2d(0.6989), alt: 30 }
  },
  {
    id: 'pointcloud-batched',
    name: 'Point Cloud Batched',
    category: 'PointCloud',
    url: '/cesium/Cesium3DTiles/PointCloud/PointCloudBatched/tileset.json',
    description: '批量点云',
    flyTo: { lon: r2d(-1.3197), lat: r2d(0.6989), alt: 30 }
  },
  {
    id: 'composite',
    name: 'Composite',
    category: 'Composite',
    url: '/cesium/Cesium3DTiles/Composite/Composite/tileset.json',
    description: '复合 cmpt 格式',
    flyTo: { lon: r2d(-1.3197), lat: r2d(0.6989), alt: 150 }
  },
  {
    id: 'hierarchy',
    name: 'Batch Table Hierarchy',
    category: 'Hierarchy',
    url: '/cesium/Cesium3DTiles/Hierarchy/BatchTableHierarchy/tileset.json',
    description: '属性表层级结构',
    flyTo: { lon: r2d(-1.3197), lat: r2d(0.6989), alt: 150 }
  },
  {
    id: 'voxel-box',
    name: 'Voxel Box',
    category: 'Voxel',
    url: '/cesium/Cesium3DTiles/Voxel/VoxelBox3DTiles/tileset.json',
    description: '体素盒子',
    flyTo: { lon: 0, lat: 0, alt: 20000000 }
  },
  {
    id: 'voxel-cylinder',
    name: 'Voxel Cylinder',
    category: 'Voxel',
    url: '/cesium/Cesium3DTiles/Voxel/VoxelCylinder3DTiles/tileset.json',
    description: '体素圆柱',
    flyTo: { lon: 0, lat: 0, alt: 20000000 }
  },
  {
    id: 'voxel-ellipsoid',
    name: 'Voxel Ellipsoid',
    category: 'Voxel',
    url: '/cesium/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json',
    description: '体素椭球',
    flyTo: { lon: 0, lat: 0, alt: 20000000 }
  }
]

const CATEGORY_COLOR: Record<string, string> = {
  Batched: 'blue',
  Instanced: 'purple',
  PointCloud: 'green',
  Composite: 'orange',
  Hierarchy: 'cyan',
  Voxel: 'magenta'
}

// 按分类分组
const CATEGORIES = Array.from(new Set(TILESETS.map(t => t.category)))

export default function TilesViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const tilesetMapRef = useRef<Map<string, Cesium.Cesium3DTileset>>(new Map())
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set())
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const viewer = new Cesium.Viewer(containerRef.current, {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: true,
      sceneModePicker: false,
      selectionIndicator: true,
      timeline: false,
      navigationHelpButton: false,
      requestRenderMode: false
    })

    ;(viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none'
    viewerRef.current = viewer

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(r2d(-1.3197), r2d(0.6989), 800),
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
      tilesetMapRef.current.clear()
    }
  }, [])

  const loadTileset = async (item: TilesetItem) => {
    const viewer = viewerRef.current
    if (!viewer) return

    if (loadedIds.has(item.id)) {
      flyToTileset(item)
      return
    }

    setLoadingId(item.id)
    try {
      const tileset = await Cesium.Cesium3DTileset.fromUrl(item.url)
      viewer.scene.primitives.add(tileset)
      tilesetMapRef.current.set(item.id, tileset)
      setLoadedIds(prev => new Set(prev).add(item.id))
      flyToTileset(item)
    } catch (e) {
      console.error(`加载 ${item.name} 失败`, e)
    } finally {
      setLoadingId(null)
    }
  }

  const flyToTileset = (item: TilesetItem) => {
    const viewer = viewerRef.current
    if (!viewer) return

    const tileset = tilesetMapRef.current.get(item.id)
    if (tileset) {
      viewer.zoomTo(tileset)
      return
    }

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(item.flyTo.lon, item.flyTo.lat, item.flyTo.alt),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      },
      duration: 1.5
    })
  }

  const removeTileset = (item: TilesetItem) => {
    const viewer = viewerRef.current
    if (!viewer) return

    const tileset = tilesetMapRef.current.get(item.id)
    if (tileset) {
      viewer.scene.primitives.remove(tileset)
      tilesetMapRef.current.delete(item.id)
      setLoadedIds(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  const filtered = activeCategory
    ? TILESETS.filter(t => t.category === activeCategory)
    : TILESETS

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <div ref={containerRef} style={{ flex: 1, height: '100%' }} />

      <div style={{
        width: 270,
        height: '100%',
        background: 'rgba(20,24,36,0.95)',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* 标题 */}
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Space>
            <DatabaseOutlined style={{ color: '#4fc3f7' }} />
            <Text strong style={{ color: '#fff', fontSize: 15 }}>3D Tiles 数据集</Text>
          </Space>
          <br />
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            共 {TILESETS.length} 个数据集，已加载 {loadedIds.size} 个
          </Text>
        </div>

        {/* 分类过滤 */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <Tag
            color={activeCategory === null ? 'blue' : undefined}
            style={{ cursor: 'pointer', margin: 0, fontSize: 11 }}
            onClick={() => setActiveCategory(null)}
          >
            全部
          </Tag>
          {CATEGORIES.map(cat => (
            <Tag
              key={cat}
              color={activeCategory === cat ? CATEGORY_COLOR[cat] : undefined}
              style={{ cursor: 'pointer', margin: 0, fontSize: 11 }}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            >
              {cat}
            </Tag>
          ))}
        </div>

        {/* 列表 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <List
            dataSource={filtered}
            renderItem={item => {
              const loaded = loadedIds.has(item.id)
              const loading = loadingId === item.id
              return (
                <List.Item style={{
                  padding: '8px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: loaded ? 'rgba(79,195,247,0.06)' : 'transparent'
                }}>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Space size={6}>
                        {loaded && <Badge status="processing" />}
                        <Text style={{ color: loaded ? '#4fc3f7' : '#fff', fontSize: 13 }}>{item.name}</Text>
                      </Space>
                      <Tag color={CATEGORY_COLOR[item.category]} style={{ margin: 0, fontSize: 10 }}>
                        {item.category}
                      </Tag>
                    </div>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, display: 'block', marginBottom: 7 }}>
                      {item.description}
                    </Text>
                    <Space size={6}>
                      <Button
                        size="small"
                        type={loaded ? 'default' : 'primary'}
                        loading={loading}
                        icon={loaded ? <AimOutlined /> : <EyeOutlined />}
                        onClick={() => loadTileset(item)}
                        style={{ fontSize: 11 }}
                      >
                        {loaded ? '定位' : '加载'}
                      </Button>
                      {loaded && (
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeTileset(item)}
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

        <Divider style={{ margin: 0, borderColor: 'rgba(255,255,255,0.08)' }} />
        <div style={{ padding: 12, display: 'flex', gap: 8 }}>
          <Button
            block
            icon={<AimOutlined />}
            onClick={() => viewerRef.current?.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(r2d(-1.3197), r2d(0.6989), 800),
              orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 },
              duration: 1.5
            })}
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', flex: 1 }}
          >
            总览
          </Button>
          <Button
            block
            danger
            disabled={loadedIds.size === 0}
            onClick={() => {
              const viewer = viewerRef.current
              if (!viewer) return
              tilesetMapRef.current.forEach(ts => viewer.scene.primitives.remove(ts))
              tilesetMapRef.current.clear()
              setLoadedIds(new Set())
            }}
            style={{ flex: 1 }}
          >
            清空
          </Button>
        </div>
      </div>
    </div>
  )
}
