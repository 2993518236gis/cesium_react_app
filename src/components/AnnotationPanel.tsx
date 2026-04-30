import { useState, useEffect } from 'react'
import { useAnnotationStore, type Annotation, type AnnotationType } from '../store/annotationStore'

const ICONS = ['📍', '🏠', '🏢', '🏔️', '⭐', '🚩', '🔴', '🟡', '🟢', '🔵']
const COLORS = ['#2196f3', '#f44336', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#ffffff']

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const panel: React.CSSProperties = {
  background: '#1e1e2e',
  border: '1px solid #444',
  borderRadius: 10,
  padding: '20px 24px',
  minWidth: 300,
  color: '#eee',
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#2a2a3e',
  border: '1px solid #555',
  borderRadius: 5,
  color: '#eee',
  padding: '6px 10px',
  fontSize: 14,
  boxSizing: 'border-box',
  marginTop: 4,
}

const btnRow: React.CSSProperties = { display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }

const btn = (primary?: boolean, danger?: boolean): React.CSSProperties => ({
  padding: '6px 18px',
  borderRadius: 5,
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  background: danger ? '#c62828' : primary ? '#1565c0' : '#333',
  color: '#fff',
})

interface Props {
  /** 新建模式传 pendingPos，编辑模式传 editingId */
  mode: 'create' | 'edit'
}

export default function AnnotationPanel({ mode }: Props) {
  const store = useAnnotationStore()
  const existing = mode === 'edit'
    ? store.annotations.find(a => a.id === store.editingId)
    : null

  const defaultType: AnnotationType = (store.mode !== 'none' ? store.mode : existing?.type) as AnnotationType ?? 'pin'

  const [text, setText] = useState(existing?.text ?? '')
  const [type, setType] = useState<AnnotationType>(existing?.type ?? defaultType)
  const [icon, setIcon] = useState(existing?.icon ?? '📍')
  const [color, setColor] = useState(existing?.color ?? '#2196f3')

  useEffect(() => {
    if (existing) {
      setText(existing.text)
      setType(existing.type)
      setIcon(existing.icon ?? '📍')
      setColor(existing.color ?? '#2196f3')
    }
  }, [store.editingId])

  const handleConfirm = () => {
    if (!text.trim()) return
    if (mode === 'create' && store.pendingPos) {
      const a: Annotation = {
        id: `ann-${Date.now()}`,
        type,
        ...store.pendingPos,
        text: text.trim(),
        icon,
        color,
      }
      store.addAnnotation(a)
      // 保持模式，继续添加下一个
    } else if (mode === 'edit' && store.editingId) {
      store.updateAnnotation(store.editingId, { text: text.trim(), type, icon, color })
    }
  }

  const handleDelete = () => {
    if (store.editingId) store.removeAnnotation(store.editingId)
  }

  const handleCancel = () => {
    store.setPendingPos(null)
    store.setEditingId(null)
  }

  const title = mode === 'create' ? '新建标注' : '编辑标注'

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) handleCancel() }}>
      <div style={panel}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>{title}</div>

        {/* 类型选择（仅新建时可改） */}
        {mode === 'create' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>类型</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['pin', 'label', 'marker'] as AnnotationType[]).map(t => (
                <button key={t} onClick={() => setType(t)} style={{
                  ...btn(type === t),
                  background: type === t ? '#1565c0' : '#2a2a3e',
                  border: type === t ? '1px solid #4fc3f7' : '1px solid #555',
                }}>
                  {t === 'pin' ? '📌 点标注' : t === 'label' ? '🔤 文本' : '🗺️ 图标'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 文本 */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#aaa' }}>
            {type === 'label' ? '标签文本' : '名称'}
          </label>
          <input
            style={inputStyle}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={type === 'label' ? '输入显示文本' : '输入标注名称'}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
          />
        </div>

        {/* 图标选择（marker 类型） */}
        {type === 'marker' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>图标</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ICONS.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)} style={{
                  fontSize: 20, padding: '4px 6px', borderRadius: 5, cursor: 'pointer',
                  background: icon === ic ? '#1a3a4a' : '#2a2a3e',
                  border: icon === ic ? '2px solid #4fc3f7' : '1px solid #555',
                }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 颜色选择（pin / label） */}
        {type !== 'marker' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>颜色</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setColor(c)} style={{
                  width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: color === c ? '2px solid #fff' : '2px solid transparent',
                  boxSizing: 'border-box',
                }} />
              ))}
            </div>
          </div>
        )}

        <div style={btnRow}>
          {mode === 'edit' && (
            <button style={btn(false, true)} onClick={handleDelete}>删除</button>
          )}
          <button style={btn()} onClick={handleCancel}>取消</button>
          <button style={btn(true)} onClick={handleConfirm} disabled={!text.trim()}>
            {mode === 'create' ? '添加' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
