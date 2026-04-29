/**
 * EnrollmentKanban.jsx — CredFlow Payer Enrollment Board
 * Optimistic drag-drop: cards move instantly, Supabase syncs in background.
 */

import { useState, useEffect } from 'react'

const PIPELINE = [
  { id: 'not_started',  label: 'Not Started',                    color: '#475569' },
  { id: 'submitted',    label: 'Application Submitted',           color: '#3b82f6' },
  { id: 'caqh',         label: 'Awaiting CAQH',                  color: '#8b5cf6' },
  { id: 'pending',      label: 'Pending Verification',            color: '#f59e0b' },
  { id: 'info',         label: 'Additional Info Requested',       color: '#ef4444' },
  { id: 'review',       label: 'Under Review',                    color: '#06b6d4' },
  { id: 'approved',     label: 'Approved – Awaiting Contract',    color: '#10b981' },
  { id: 'contracted',   label: 'Contracted – Pending Effective',  color: '#22c55e' },
  { id: 'active',       label: 'Active',                          color: '#4ade80' },
  { id: 'denied',       label: 'Denied',                          color: '#9ca3af' },
]

const STAGE_TO_ID = {
  'Not Started':                         'not_started',
  'Application Submitted':               'submitted',
  'Awaiting CAQH':                       'caqh',
  'Pending Verification':                'pending',
  'Additional Info Requested':           'info',
  'Under Review':                        'review',
  'Approved – Awaiting Contract':        'approved',
  'Contracted – Pending Effective Date': 'contracted',
  'Active':                              'active',
  'Denied':                              'denied',
}

const ID_TO_STAGE = Object.fromEntries(
  Object.entries(STAGE_TO_ID).map(([k, v]) => [v, k])
)

const KANBAN_COLS = [
  { id: 'pipeline',      label: 'In Pipeline',           stageIds: ['not_started','submitted','caqh','pending','info','review'], accent: '#3b82f6' },
  { id: 'approved',      label: 'Approved / Contracted', stageIds: ['approved','contracted'],  accent: '#10b981' },
  { id: 'participating', label: 'Participating',          stageIds: ['active'],                 accent: '#4ade80' },
  { id: 'denied',        label: 'Denied / Inactive',      stageIds: ['denied'],                 accent: '#6b7280' },
]

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

function FollowupBadge({ followup }) {
  const days = daysUntil(followup)
  if (days === null) return null
  const urgent = days <= 3
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
      background: urgent ? '#ef444420' : '#f59e0b20',
      color: urgent ? '#ef4444' : '#f59e0b',
      border: `1px solid ${urgent ? '#ef444440' : '#f59e0b40'}`,
      whiteSpace: 'nowrap',
    }}>
      {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `Follow-up in ${days}d`}
    </span>
  )
}

function EnrollmentCard({ enrollment, provider, payer, onOpen, onDragStart, isDragging }) {
  const stage = PIPELINE.find(p => p.id === STAGE_TO_ID[enrollment.stage]) || PIPELINE[0]
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, enrollment.id)}
      onClick={() => onOpen(enrollment)}
      style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderLeft: `3px solid ${stage.color}`,
        borderRadius: 8,
        padding: '10px 12px',
        cursor: 'grab',
        opacity: isDragging ? 0.35 : 1,
        transition: 'opacity 0.1s, box-shadow 0.15s, transform 0.1s',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 0 0 1px ${stage.color}40, 0 4px 12px #00000040`
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9', lineHeight: 1.3 }}>
            {provider ? `${provider.lname}, ${provider.fname}` : 'Unknown Provider'}
          </div>
          {provider?.cred && <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{provider.cred}</div>}
        </div>
        <FollowupBadge followup={enrollment.followup} />
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{payer?.name || '—'}</div>
      <div style={{
        display: 'inline-flex', alignItems: 'center',
        background: `${stage.color}18`, border: `1px solid ${stage.color}35`,
        borderRadius: 4, padding: '2px 7px',
        fontSize: 10, fontWeight: 600, color: stage.color,
        letterSpacing: '0.02em', textTransform: 'uppercase',
      }}>
        {enrollment.stage}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 10, color: '#475569' }}>
        {enrollment.submitted && <span>Submitted {enrollment.submitted}</span>}
        {enrollment.effective && <span>· Eff. {enrollment.effective}</span>}
        {enrollment.eft !== 'Not Set Up' && <span style={{ color: '#22c55e' }}>· EFT ✓</span>}
      </div>
    </div>
  )
}

function KanbanColumn({ col, cards, providers, payers, onOpen, onDrop, onDragOver, onDragLeave, onDragStart, isDragOver, dragId }) {
  return (
    <div
      style={{
        minWidth: 280, maxWidth: 320, flex: '1 1 280px',
        background: isDragOver ? '#111827' : '#080d14',
        border: `1px solid ${isDragOver ? col.accent : '#1e293b'}`,
        borderRadius: 10,
        transition: 'border-color 0.12s, background 0.12s',
        display: 'flex', flexDirection: 'column',
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div style={{
        padding: '12px 14px',
        borderBottom: `1px solid ${isDragOver ? col.accent + '40' : '#1e293b'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.accent, boxShadow: `0 0 6px ${col.accent}80` }} />
          <span style={{ fontWeight: 600, fontSize: 12, color: '#cbd5e1', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            {col.label}
          </span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: col.accent, background: `${col.accent}18`, borderRadius: 10, padding: '1px 8px', border: `1px solid ${col.accent}30` }}>
          {cards.length}
        </span>
      </div>

      {col.stageIds.length > 1 && (
        <div style={{ padding: '6px 14px', borderBottom: '1px solid #0d1422', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {col.stageIds.map(sid => {
            const stage = PIPELINE.find(p => p.id === sid)
            return <span key={sid} style={{ fontSize: 9, fontWeight: 600, color: stage?.color || '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stage?.label}</span>
          })}
        </div>
      )}

      <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120, overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
        {cards.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isDragOver ? col.accent : '#1e293b', fontSize: 11,
            border: `1px dashed ${isDragOver ? col.accent : '#1e293b'}`,
            borderRadius: 6, padding: 16, transition: 'all 0.12s',
          }}>
            {isDragOver ? 'Release to move here' : 'Drop enrollments here'}
          </div>
        ) : cards.map(enr => (
          <EnrollmentCard
            key={enr.id}
            enrollment={enr}
            provider={providers.find(p => p.id === enr.provId)}
            payer={payers.find(p => p.id === enr.payId)}
            onOpen={onOpen}
            onDragStart={onDragStart}
            isDragging={dragId === enr.id}
          />
        ))}
      </div>
    </div>
  )
}

function FilterBar({ providers, payers, filter, setFilter }) {
  const sel = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '6px 10px', color: '#e2e8f0', fontSize: 12, outline: 'none', cursor: 'pointer' }
  const active = filter.search || filter.provId || filter.payId || filter.followupOnly
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input style={{ ...sel, minWidth: 200 }} placeholder="Search enrollments…" value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
      <select style={sel} value={filter.provId} onChange={e => setFilter(f => ({ ...f, provId: e.target.value }))}>
        <option value="">All Providers</option>
        {providers.map(p => <option key={p.id} value={p.id}>{p.lname}, {p.fname}</option>)}
      </select>
      <select style={sel} value={filter.payId} onChange={e => setFilter(f => ({ ...f, payId: e.target.value }))}>
        <option value="">All Payers</option>
        {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={filter.followupOnly} onChange={e => setFilter(f => ({ ...f, followupOnly: e.target.checked }))} style={{ accentColor: '#ef4444' }} />
        Follow-up due
      </label>
      {active && (
        <button onClick={() => setFilter({ search: '', provId: '', payId: '', followupOnly: false })}
          style={{ background: 'transparent', border: '1px solid #1e293b', borderRadius: 6, color: '#64748b', fontSize: 11, padding: '5px 10px', cursor: 'pointer' }}>
          Clear
        </button>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function EnrollmentKanban({ enrollments = [], providers = [], payers = [], onStageChange, onOpen }) {
  // Optimistic local copy — cards move instantly, then parent DB state catches up
  const [local, setLocal] = useState(enrollments)
  useEffect(() => { setLocal(enrollments) }, [enrollments])

  const [dragId, setDragId]         = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)
  const [filter, setFilter]          = useState({ search: '', provId: '', payId: '', followupOnly: false })

  function handleDragStart(e, id) {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id) // required for Firefox
  }

  function handleDragOver(e, colId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(colId)
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null)
  }

  function handleDrop(e, colId) {
    e.preventDefault()
    const id = dragId || e.dataTransfer.getData('text/plain')
    if (!id) { setDragOverCol(null); return }

    const col = KANBAN_COLS.find(c => c.id === colId)
    if (!col) { setDragId(null); setDragOverCol(null); return }

    const newStage = ID_TO_STAGE[col.stageIds[0]]

    // 1. Move card instantly in local state (optimistic)
    setLocal(prev => prev.map(enr => enr.id === id ? { ...enr, stage: newStage } : enr))
    setDragId(null)
    setDragOverCol(null)

    // 2. Persist to DB in background — parent handles upsert + toast
    onStageChange?.(id, newStage)
  }

  function handleDragEnd() {
    setDragId(null)
    setDragOverCol(null)
  }

  const filtered = local.filter(e => {
    if (filter.provId && e.provId !== filter.provId) return false
    if (filter.payId  && e.payId  !== filter.payId)  return false
    if (filter.followupOnly && !e.followup) return false
    if (filter.search) {
      const prov  = providers.find(p => p.id === e.provId)
      const payer = payers.find(p => p.id === e.payId)
      const hay   = [prov?.fname, prov?.lname, payer?.name, e.stage].join(' ').toLowerCase()
      if (!hay.includes(filter.search.toLowerCase())) return false
    }
    return true
  })

  const stats = {
    total:    local.length,
    active:   local.filter(e => e.stage === 'Active').length,
    pending:  local.filter(e => ['Application Submitted','Awaiting CAQH','Pending Verification','Under Review'].includes(e.stage)).length,
    followup: local.filter(e => e.followup && daysUntil(e.followup) <= 3).length,
    denied:   local.filter(e => e.stage === 'Denied').length,
  }

  return (
    <div style={{ fontFamily: "'Geist', system-ui, sans-serif", color: '#e2e8f0' }} onDragEnd={handleDragEnd}>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total',            value: stats.total,    color: '#3b82f6' },
          { label: 'Active',           value: stats.active,   color: '#4ade80' },
          { label: 'In Pipeline',      value: stats.pending,  color: '#f59e0b' },
          { label: 'Urgent Follow-up', value: stats.followup, color: '#ef4444' },
          { label: 'Denied',           value: stats.denied,   color: '#6b7280' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 16 }}>
        <FilterBar providers={providers} payers={payers} filter={filter} setFilter={setFilter} />
      </div>

      {/* Board */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
        {KANBAN_COLS.map(col => (
          <KanbanColumn
            key={col.id}
            col={col}
            cards={filtered.filter(e => col.stageIds.includes(STAGE_TO_ID[e.stage]))}
            providers={providers}
            payers={payers}
            onOpen={onOpen}
            onDragStart={handleDragStart}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
            isDragOver={dragOverCol === col.id}
            dragId={dragId}
          />
        ))}
      </div>
    </div>
  )
}
