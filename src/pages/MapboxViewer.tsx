import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Button, Space, Tooltip } from 'antd'
import { PlusOutlined, MinusOutlined, AimOutlined } from '@ant-design/icons'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string

const BEIJING: [number, number] = [116.3974, 39.9093]
const DEFAULT_ZOOM = 10

export default function MapboxViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const popupRef = useRef<mapboxgl.Popup | null>(null)
  const [coords, setCoords] = useState<{ lng: number; lat: number } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: BEIJING,
      zoom: DEFAULT_ZOOM
    })

    const popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      className: 'coord-popup'
    })
    popupRef.current = popup

    map.on('click', (e) => {
      const { lng, lat } = e.lngLat
      setCoords({ lng, lat })
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="font-size:12px;line-height:2;color:#e8e8e8;">
            <div style="display:flex;gap:8px;align-items:center;">
              <span style="color:rgba(255,255,255,0.45);width:28px;">经度</span>
              <span style="color:#40a9ff;font-family:monospace;">${lng.toFixed(6)}</span>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <span style="color:rgba(255,255,255,0.45);width:28px;">纬度</span>
              <span style="color:#40a9ff;font-family:monospace;">${lat.toFixed(6)}</span>
            </div>
          </div>`
        )
        .addTo(map)
    })

    mapRef.current = map

    return () => {
      popup.remove()
      map.remove()
      mapRef.current = null
      popupRef.current = null
    }
  }, [])

  const zoomIn = () => mapRef.current?.zoomIn()
  const zoomOut = () => mapRef.current?.zoomOut()
  const reset = () => mapRef.current?.flyTo({ center: BEIJING, zoom: DEFAULT_ZOOM })

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        .coord-popup .mapboxgl-popup-content {
          background: rgba(20, 24, 36, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          padding: 10px 14px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
        }
        .coord-popup .mapboxgl-popup-tip {
          border-top-color: rgba(20, 24, 36, 0.92);
        }
        .coord-popup .mapboxgl-popup-close-button {
          color: rgba(255,255,255,0.45);
          font-size: 16px;
          line-height: 1;
          padding: 2px 6px;
        }
        .coord-popup .mapboxgl-popup-close-button:hover {
          color: #fff;
          background: transparent;
        }
      `}</style>
      <div ref={containerRef} style={{ flex: 1, height: '100%' }} />

      {/* 底部坐标状态栏 */}
      {coords && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(20,24,36,0.85)',
          color: '#fff',
          padding: '4px 14px',
          borderRadius: 4,
          fontSize: 13,
          pointerEvents: 'none',
          border: '1px solid rgba(255,255,255,0.15)',
          whiteSpace: 'nowrap'
        }}>
          经度：{coords.lng.toFixed(6)}　纬度：{coords.lat.toFixed(6)}
        </div>
      )}

      {/* 右下角工具栏 */}
      <div style={{
        position: 'absolute',
        bottom: 32,
        right: 16,
        zIndex: 10
      }}>
        <Space direction="vertical" size={6}>
          <Tooltip title="放大" placement="left">
            <Button
              icon={<PlusOutlined />}
              onClick={zoomIn}
              style={{ background: 'rgba(20,24,36,0.85)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
            />
          </Tooltip>
          <Tooltip title="缩小" placement="left">
            <Button
              icon={<MinusOutlined />}
              onClick={zoomOut}
              style={{ background: 'rgba(20,24,36,0.85)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
            />
          </Tooltip>
          <Tooltip title="复位" placement="left">
            <Button
              icon={<AimOutlined />}
              onClick={reset}
              style={{ background: 'rgba(20,24,36,0.85)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
            />
          </Tooltip>
        </Space>
      </div>
    </div>
  )
}
