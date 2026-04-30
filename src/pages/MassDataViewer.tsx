import { useEffect, useRef, useState, useCallback } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { Button, Select, Space, Typography, Divider, Statistic, Tag, Radio, Tooltip } from 'antd'
import {
  ThunderboltOutlined,
  ClearOutlined,
  InfoCircleOutlined,
  DotChartOutlined,
  PictureOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'

const { Text } = Typography

// ─── 类型 ────────────────────────────────────────────────────────────────────

type RenderMode = 'entity' | 'point' | 'billboard'

interface BenchResult {
  mode: RenderMode
  count: number
  buildMs: number   // 构建耗时
  label: string
}

// ─── 常量 ────────────────────────────────────────────────────────────────────

const COUNT_OPTIONS = [
  { label: '1 000', value: 1_000 },
  { label: '1 万',  value: 10_000 },
  { label: '5 万',  value: 50_000 },
  { label: '10 万', value: 100_000 },
]

const MODE_META: Record<RenderMode, { label: string; color: string; icon: React.ReactNode; tip: string }> = {
  entity: {
    label: 'Entity',
    color: 'orange',
    icon: <AppstoreOutlined />,
    tip: '每个点封装为独立 Entity，JS 对象开销大，适合少量交互对象',
  },
  point: {
    label: 'PointPrimitive',
    color: 'green',
    icon: <DotChartOutlined />,
    tip: 'PointPrimitiveCollection 批量上传 GPU，渲染效率极高，适合海量点云',
  },
  billboard: {
    label: 'Billboard',
    color: 'blue',
    icon: <PictureOutlined />,
    tip: 'BillboardCollection 批量公告板，支持图标/图片，性能优于 Entity',
  },
}

// 在北京周边随机生成经纬度
function randomLngLat(): [number, number] {
  const lng = 116.0 + Math.random() * 1.0
  const lat = 39.6 + Math.random() * 0.8
  return [lng, lat]
}

// 随机颜色
function randomColor(): Cesium.Color {
  return new Cesium.Color(Math.random(), Math.random() * 0.5 + 0.5, Math.random(), 1)
}

// ─── 组件 ────────────────────────────────────────────────────────────────────

export default function MassDataViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef    = useRef<Cesium.Viewer | null>(null)
  // 当前加载的 primitive 或 entity collection 引用，用于清除
  const primitiveRef = useRef<Cesium.PointPrimitiveCollection | Cesium.BillboardCollection | null>(null)
  const entitiesRef  = useRef<Cesium.Entity[]>([])

  const [mode,    setMode]    = useState<RenderMode>('point')
  const [count,   setCount]   = useState(10_000)
  const [loading, setLoading] = useState(false)
  const [fps,     setFps]     = useState<number | null>(null)
  const [results, setResults] = useState<BenchResult[]>([])
  // const fpsFrames = useRef<number[]>([])
  const fpsRafId  = useRef<number>(0)

  // ── 初始化 Viewer ──────────────────────────────────────────────────────────
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
    })
    ;(viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none'
    viewerRef.current = viewer

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 120_000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
      duration: 0,
    })

    // FPS 监测：每秒统计一次
    let last = performance.now()
    let frames = 0
    const tick = () => {
      frames++
      const now = performance.now()
      if (now - last >= 1000) {
        setFps(Math.round(frames * 1000 / (now - last)))
        frames = 0
        last = now
      }
      fpsRafId.current = requestAnimationFrame(tick)
    }
    fpsRafId.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(fpsRafId.current)
      viewer.destroy()
      viewerRef.current = null
    }
  }, [])

  // ── 清除当前数据 ───────────────────────────────────────────────────────────
  const clearData = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    if (primitiveRef.current) {
      viewer.scene.primitives.remove(primitiveRef.current)
      primitiveRef.current = null
    }
    if (entitiesRef.current.length > 0) {
      entitiesRef.current.forEach(e => viewer.entities.remove(e))
      entitiesRef.current = []
    }
  }, [])

  // ── 加载数据 ───────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const viewer = viewerRef.current
    if (!viewer || loading) return

    clearData()
    setLoading(true)

    // 让 UI 先渲染 loading 状态
    await new Promise(r => setTimeout(r, 30))

    const t0 = performance.now()

    if (mode === 'entity') {
      const entities: Cesium.Entity[] = []
      for (let i = 0; i < count; i++) {
        const [lng, lat] = randomLngLat()
        const e = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
          point: {
            pixelSize: 6,
            color: randomColor(),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
        })
        entities.push(e)
      }
      entitiesRef.current = entities

    } else if (mode === 'point') {
      const collection = new Cesium.PointPrimitiveCollection()
      for (let i = 0; i < count; i++) {
        const [lng, lat] = randomLngLat()
        collection.add({
          position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
          color: randomColor(),
          pixelSize: 6,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
        })
      }
      viewer.scene.primitives.add(collection)
      primitiveRef.current = collection

    } else {
      // billboard
      const collection = new Cesium.BillboardCollection({ scene: viewer.scene })
      for (let i = 0; i < count; i++) {
        const [lng, lat] = randomLngLat()
        collection.add({
          position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
          image: makeDotCanvas(randomColor()),
          width: 10,
          height: 10,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        })
      }
      viewer.scene.primitives.add(collection)
      primitiveRef.current = collection
    }

    const buildMs = Math.round(performance.now() - t0)

    setResults(prev => {
      const next = [
        { mode, count, buildMs, label: MODE_META[mode].label },
        ...prev,
      ].slice(0, 6)
      return next
    })

    setLoading(false)
  }, [mode, count, loading, clearData])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ flex: 1, height: '100%' }} />
      <SidePanel
        mode={mode}
        count={count}
        loading={loading}
        fps={fps}
        results={results}
        onModeChange={setMode}
        onCountChange={setCount}
        onLoad={loadData}
        onClear={clearData}
      />
    </div>
  )
}

// ─── 侧边面板 ─────────────────────────────────────────────────────────────────

interface SidePanelProps {
  mode: RenderMode
  count: number
  loading: boolean
  fps: number | null
  results: BenchResult[]
  onModeChange: (m: RenderMode) => void
  onCountChange: (n: number) => void
  onLoad: () => void
  onClear: () => void
}

function SidePanel({ mode, count, loading, fps, results, onModeChange, onCountChange, onLoad, onClear }: SidePanelProps) {
  return (
    <div style={{
      width: 280,
      height: '100%',
      background: 'rgba(20,24,36,0.97)',
      borderLeft: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* 标题 */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Space>
          <ThunderboltOutlined style={{ color: '#faad14' }} />
          <Text strong style={{ color: '#fff', fontSize: 15 }}>大规模数据渲染</Text>
        </Space>
        <br />
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
          对比三种渲染方式的性能差异
        </Text>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>

        {/* FPS */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <Statistic
            title={<span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>实时 FPS</span>}
            value={fps ?? '--'}
            valueStyle={{ color: fps != null && fps < 30 ? '#ff4d4f' : '#52c41a', fontSize: 28 }}
          />
        </div>

        <Divider style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '0 0 14px' }} />

        {/* 渲染模式 */}
        <div style={{ marginBottom: 14 }}>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, display: 'block', marginBottom: 8 }}>
            渲染模式
          </Text>
          <Radio.Group
            value={mode}
            onChange={e => onModeChange(e.target.value)}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {(Object.keys(MODE_META) as RenderMode[]).map(m => (
              <Radio key={m} value={m} style={{ color: '#ccc' }}>
                <Space size={6}>
                  <Tag color={MODE_META[m].color} style={{ margin: 0 }}>{MODE_META[m].label}</Tag>
                  <Tooltip title={MODE_META[m].tip} placement="right">
                    <InfoCircleOutlined style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }} />
                  </Tooltip>
                </Space>
              </Radio>
            ))}
          </Radio.Group>
        </div>

        <Divider style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '0 0 14px' }} />

        {/* 数量选择 */}
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, display: 'block', marginBottom: 8 }}>
            数据量
          </Text>
          <Select
            value={count}
            onChange={onCountChange}
            options={COUNT_OPTIONS}
            style={{ width: '100%' }}
          />
        </div>

        {/* 操作按钮 */}
        <Space style={{ width: '100%' }} direction="vertical" size={8}>
          <Button
            type="primary"
            block
            icon={<ThunderboltOutlined />}
            loading={loading}
            onClick={onLoad}
          >
            {loading ? '加载中...' : `加载 ${count.toLocaleString()} 个点`}
          </Button>
          <Button
            block
            icon={<ClearOutlined />}
            onClick={onClear}
            style={{ background: 'rgba(255,255,255,0.06)', color: '#ccc', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            清除数据
          </Button>
        </Space>

        <Divider style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '16px 0 12px' }} />

        {/* 历史记录 */}
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, display: 'block', marginBottom: 8 }}>
          构建耗时记录
        </Text>
        {results.length === 0 && (
          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>暂无记录</Text>
        )}
        {results.map((r, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '5px 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <Space size={6}>
              <Tag color={MODE_META[r.mode].color} style={{ margin: 0, fontSize: 11 }}>{r.label}</Tag>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                {r.count.toLocaleString()} 个
              </Text>
            </Space>
            <Text style={{ color: r.buildMs > 1000 ? '#ff7875' : '#73d13d', fontSize: 13, fontFamily: 'monospace' }}>
              {r.buildMs} ms
            </Text>
          </div>
        ))}

        <Divider style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '14px 0 10px' }} />

        {/* 说明 */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 6,
          padding: '10px 12px',
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
          lineHeight: 1.8,
        }}>
          <div>· <b style={{ color: 'rgba(255,255,255,0.6)' }}>Entity</b>：JS 对象封装，10k+ 明显卡顿</div>
          <div>· <b style={{ color: 'rgba(255,255,255,0.6)' }}>PointPrimitive</b>：GPU 批量渲染，10w 流畅</div>
          <div>· <b style={{ color: 'rgba(255,255,255,0.6)' }}>Billboard</b>：支持图标，性能居中</div>
        </div>
      </div>
    </div>
  )
}
function makeDotCanvas(color: Cesium.Color): string {
  const size = 12
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2)
  ctx.fillStyle = color.toCssColorString()
  ctx.fill()
  return canvas.toDataURL()
}
