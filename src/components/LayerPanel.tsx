import { useState, useRef } from 'react'
import * as Cesium from 'cesium'
import { useLayerStore, type Layer } from '../store/layerStore'

const PANEL: React.CSSProperties = {
  position: 'absolute',
  top: 0, right: 0,
  width: 280,
  height: '100%',
  background: '#1a1a2e',
  borderLeft: '1px solid #333',
  zIndex: 200,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '-4px 0 16px rgba(0,0,0,0.5)',
}

const HEADER: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #333',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  color: '#eee',
  fontWeight: 600,
  fontSize: 14,
}

const SCROLL: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '8px 0',
}

const LAYER_ITEM: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #2a2a3e',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const smallBtn = (danger?: boolean): React.CSSProperties => ({
  padding: '2px 7px',
  borderRadius: 4,
  border: '1px solid ' + (danger ? '#c62828' : '#444'),
  background: danger ? '#3a1010' : '#2a2a3e',
  color: danger ? '#f88' : '#aaa',
  cursor: 'pointer',
  fontSize: 11,
})

const CHECKBOX: React.CSSProperties = {
  cursor: 'pointer',
  accentColor: '#4fc3f7',
}

const EDIT_INPUT: React.CSSProperties = {
  flex: 1,
  background: '#2a2a3e',
  border: '1px solid #4fc3f7',
  borderRadius: 3,
  color: '#eee',
  fontSize: 13,
  padding: '1px 4px',
  outline: 'none',
}

export default function LayerPanel({ onClose, viewerRef }: { onClose: () => void; viewerRef: React.RefObject<Cesium.Viewer | null> }) {
  const { layers, removeLayer, updateLayer } = useLayerStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = (layer: Layer) => {
    setEditingId(layer.id)
    setEditingName(layer.name)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commitEdit = (id: string) => {
    const name = editingName.trim()
    if (name) updateLayer(id, { name })
    setEditingId(null)
  }

  const handleVisibility = (layer: Layer, visible: boolean) => {
    const viewer = viewerRef.current
    if (viewer && !viewer.isDestroyed() && layer.entityIds) {
      layer.entityIds.forEach(id => {
        const e = viewer.entities.getById(id)
        if (e) e.show = visible
      })
      viewer.scene.requestRender()
    }
    updateLayer(layer.id, { visible })
  }

  const handleRemove = (layer: Layer) => {
    const viewer = viewerRef.current
    if (viewer && !viewer.isDestroyed() && layer.entityIds) {
      layer.entityIds.forEach(id => {
        const e = viewer.entities.getById(id)
        if (e) viewer.entities.remove(e)
      })
      viewer.scene.requestRender()
    }
    removeLayer(layer.id)
  }

  const sorted = [...layers].sort((a, b) => b.order - a.order)

  return (
    <div style={PANEL}>
      <div style={HEADER}>
        <span>绘制图层</span>
        <button onClick={onClose} style={{ ...smallBtn(), fontSize: 14, padding: '2px 8px' }}>✕</button>
      </div>

      <div style={SCROLL}>
        {sorted.length === 0 && (
          <div style={{ color: '#555', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            暂无绘制图层
          </div>
        )}
        {sorted.map(layer => (
          <div key={layer.id} style={LAYER_ITEM}>
            <input
              type="checkbox"
              checked={layer.visible}
              onChange={e => handleVisibility(layer, e.target.checked)}
              style={CHECKBOX}
              title={`切换图层"${layer.name}"可见性`}
              aria-label={`切换图层"${layer.name}"可见性`}
            />
            {editingId === layer.id ? (
              <input
                ref={inputRef}
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onBlur={() => commitEdit(layer.id)}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(layer.id); if (e.key === 'Escape') setEditingId(null) }}
                style={EDIT_INPUT}
                title="图层名称"
                aria-label="图层名称"
                placeholder="输入图层名称"
              />
            ) : (
              <span
                onDoubleClick={() => startEdit(layer)}
                title="双击重命名"
                style={{ flex: 1, color: layer.visible ? '#ddd' : '#666', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}
              >
                {layer.name}
              </span>
            )}
            <button style={smallBtn(true)} title="删除" onClick={() => handleRemove(layer)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
