/**
 * EnrollmentKanban.jsx — CredFlow Payer Enrollment Board
 *
 * Drop-in component for pages/index.js.
 * Props:
 *   enrollments  — array of enrollmentFromDb() objects
 *   providers    — array of providerFromDb() objects
 *   payers       — array of payerFromDb() objects
 *   onStageChange(enrollmentId, newStage) — called on drag-drop or quick-set
 *   onOpen(enrollment)                   — opens the detail drawer
 */

import { useState, useRef } from 'react'

// ─── 10-Stage pipeline (matches STAGES constant in index.js) ──────────────────
const PIPELINE = [
  { id: 'not_started',  label: 'Not Started',                    color: '#475569', bg: '#1e293b' },
  { id: 'submitted',    label: 'Application Submitted',           color: '#3b82f6', bg: '#1e3a5f' },
  { id: 'caqh',         label: 'Awaiting CAQH',                  color: '#8b5cf6', bg: '#2d1b69' },
  { id: 'pending',      label: 'Pending Verification',            color: '#f59e0b', bg: '#451a03' },
  { id: 'info',         label: 'Additional Info Requested',       color: '#ef4444', bg: '#450a0a' },
  { id: 'review',       label: 'Under Review',                   color: '#06b6d4', bg: '#083344' },
  { id: 'approved',     label: 'Approved – Awaiting Contract',    color: '#10b981', bg: '#052e16' },
  { id: 'contracted',   label: 'Contracted – Pending Effective',  color: '#22c55e', bg: '#052e16' },
  { id: 'active',       label: 'Active',                         color: '#4ade80', bg: '#052e16' },
  { id: 'denied',       label: 'Denied',                         color: '#9ca3af', bg: '#111827' },
]

// Maps DB stage string → pipeline id
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

// Maps pipeline id → DB stage string
const ID_TO_STAGE = Object.fromEntries(
  Object.entries(STAGE_TO_ID).map(([k, v]) => [v, k])
)

// Kanban view groups (3-column layout the user requested + extras as swimlanes)
const KANBAN_COLS = [
  {
    id: 'pipeline',
    label: 'In Pipeline',
    stageIds: ['not_started', 'submitted', 'caqh', 'pending', 'info', 'review'],
    accent: '#3b82f6',
  },
  {
    id: 'approved',
    label: 'Approved / Contracted',
    stageIds: ['approved', 'contracted'],
    accent: '#10b981',
  },
  {
    id: 'participating',
    label: 'Participating',
    stageIds: ['active'],
    accent: '#4ade80',
  },
  {
    id: 'denied',
    label: 'Denied / Inactive',
    stageIds: ['denied'],
    accent: '#6b7280',
  },
]

// ─── Days-until helper ────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return diff
}

function FollowupBadge({ followup }) {
  const days = daysUntil(followup)
  if (days === null) return null
  const urgent = days <= 3
  const style = {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 4,
    background: urgent ? '#ef444420' : '#f59e0b20',
    color: urgent ? '#ef4444' : '#f59e0b',
    border: `1px solid ${urgent ? '#ef444440' : '#f59e0b40'}`,
    whiteSpace: 'nowrap',
  }
  return (
    <span style={style}>
      {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `Follow-up in ${days}d`}
    </span>
  )
}

// ─── Single enrollment card ───────────────────────────────────────────────────
function EnrollmentCard({ enrollment, provider, payer, onOpen, onDragStart }) {
  const stage = PIPELINE.find(p => p.id === STAGE_TO_ID[enrollment.stage]) || PIPELINE[0]

  const cardStyle = {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderLeft: `3px solid ${stage.color}`,
    borderRadius: 8,
    padding: '10px 12px',
    cursor: 'grab',
    transition: 'border-color 0.15s, transform 0.1s, box-shadow 0.15s',
    userSelect: 'none',
  }

  return (
    <div
      style={cardStyle}
      draggable
      onDragStart={(e) => onDragStart(e, enrollment.id)}
      onClick={() => onOpen(enrollment)}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = stage.color
        e.currentTarget.style.boxShadow = `0 0 0 1px ${stage.color}30, 0 4px 12px #00000040`
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#1e293b'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'none'
      }}
    >
      {/* Provider name + credentials */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9', lineHeight: 1.3 }}>
            {provider ? `${provider.lname}, ${provider.fname}` : 'Unknown Provider'}
          </div>
          {provider?.cred && (
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{provider.cred}</div>
          )}
        </div>
        <FollowupBadge followup={enrollment.followup} />
      </div>

      {/* Payer */}
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
        {payer?.name || enrollment.payId || '—'}
      </div>

      {/* Stage chip */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: `${stage.color}18`,
        border: `1px solid ${stage.color}35`,
        borderRadius: 4, padding: '2px 7px',
        fontSize: 10, fontWeight: 600, color: stage.color,
        letterSpacing: '0.02em', textTransform: 'uppercase',
      }}>
        {enrollment.stage}
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 10, color: '#475569' }}>
        {enrollment.submitted && (
          <span>Submitted {enrollment.submitted}</span>
        )}
        {enrollment.effective && (
          <span>· Eff. {enrollment.effective}</span>
        )}
        {enrollment.eft !== 'Not Set Up' && (
          <span style={{ color: '#22c55e' }}>· EFT ✓</span>
        )}
      </div>
    </div>
  )
}

// ─── Column component ─────────────────────────────────────────────────────────
function KanbanColumn({ col, cards, providers, payers, onOpen, onDrop, onDragOver, onDragStart, dropTarget }) {
  const isTarget = dropTarget === col.id

  return (
    <div style={{
      minWidth: 280, maxWidth: 320, flex: '1 1 280px',
      background: isTarget ? '#0f172a' : '#080d14',
      border: `1px solid ${isTarget ? col.accent : '#1e293b'}`,
      borderRadius: 10,
      transition: 'border-color 0.15s, background 0.15s',
      display: 'flex', flexDirection: 'column',
    }}
      onDragOver={(e) => onDragOver(e, col.id)}
      onDrop={(e) => onDrop(e, col.id)}
    >
      {/* Column header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: `1px solid ${isTarget ? col.accent + '40' : '#1e293b'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: col.accent, flexShrink: 0,
            boxShadow: `0 0 6px ${col.accent}80`,
          }} />
          <span style={{ fontWeight: 600, fontSize: 12, color: '#cbd5e1', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            {col.label}
          </span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, color: col.accent,
          background: `${col.accent}18`, borderRadius: 10,
          padding: '1px 8px', border: `1px solid ${col.accent}30`,
        }}>
          {cards.length}
        </span>
      </div>

      {/* Stage sub-labels */}
      {col.stageIds.length > 1 && (
        <div style={{ padding: '6px 14px', borderBottom: '1px solid #0d1422' }}>
          {col.stageIds.map(sid => {
            const stage = PIPELINE.find(p => p.id === sid)
            return (
              <span key={sid} style={{
                fontSize: 9, fontWeight: 600, color: stage?.color || '#475569',
                marginRight: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {stage?.label}
              </span>
            )
          })}
        </div>
      )}

      {/* Cards */}
      <div style={{
        flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 8,
        minHeight: 120, overflowY: 'auto', maxHeight: 'calc(100vh - 280px)',
      }}>
        {cards.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1e293b', fontSize: 11, fontStyle: 'italic',
            border: '1px dashed #1e293b', borderRadius: 6, padding: 16,
          }}>
            Drop enrollments here
          </div>
        ) : cards.map(enr => (
          <EnrollmentCard
            key={enr.id}
            enrollment={enr}
            provider={providers.find(p => p.id === enr.provId)}
            payer={payers.find(p => p.id === enr.payId)}
            onOpen={onOpen}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Quick Stage Setter (dropdown on right-click or ⌄ button) ─────────────────
function QuickStageMenu({ enrollment, onStageChange, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#00000070',
    }} onClick={onClose}>
      <div style={{
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10,
        padding: 16, minWidth: 260,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>
          Move to Stage
        </div>
        {PIPELINE.map(stage => (
          <button
            key={stage.id}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '7px 10px', borderRadius: 6, border: 'none',
              background: enrollment.stage === ID_TO_STAGE[stage.id] ? `${stage.color}20` : 'transparent',
              color: enrollment.stage === ID_TO_STAGE[stage.id] ? stage.color : '#94a3b8',
              fontSize: 12, cursor: 'pointer', marginBottom: 2,
              fontWeight: enrollment.stage === ID_TO_STAGE[stage.id] ? 700 : 400,
            }}
            onClick={() => {
              onStageChange(enrollment.id, ID_TO_STAGE[stage.id])
              onClose()
            }}
          >
            {stage.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────
function FilterBar({ providers, payers, filter, setFilter }) {
  const inputStyle = {
    background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6,
    padding: '6px 10px', color: '#e2e8f0', fontSize: 12,
    outline: 'none', cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        style={{ ...inputStyle, minWidth: 200 }}
        placeholder="Search enrollments…"
        value={filter.search}
        onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
      />
      <select
        style={inputStyle}
        value={filter.provId}
        onChange={e => setFilter(f => ({ ...f, provId: e.target.value }))}
      >
        <option value="">All Providers</option>
        {providers.map(p => (
          <option key={p.id} value={p.id}>{p.lname}, {p.fname}</option>
        ))}
      </select>
      <select
        style={inputStyle}
        value={filter.payId}
        onChange={e => setFilter(f => ({ ...f, payId: e.target.value }))}
      >
        <option value="">All Payers</option>
        {payers.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={filter.followupOnly}
          onChange={e => setFilter(f => ({ ...f, followupOnly: e.target.checked }))}
          style={{ accentColor: '#ef4444' }}
        />
        Follow-up due
      </label>
      {(filter.search || filter.provId || filter.payId || filter.followupOnly) && (
        <button
          onClick={() => setFilter({ search: '', provId: '', payId: '', followupOnly: false })}
          style={{
            background: 'transparent', border: '1px solid #1e293b', borderRadius: 6,
            color: '#64748b', fontSize: 11, padding: '5px 10px', cursor: 'pointer',
          }}
        >
          Clear
        </button>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function EnrollmentKanban({ enrollments = [], providers = [], payers = [], onStageChange, onOpen }) {
  const [dragId, setDragId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [filter, setFilter] = useState({ search: '', provId: '', payId: '', followupOnly: false })
  const [quickMenu, setQuickMenu] = useState(null) // enrollment obj or null

  // ── Drag handlers ──────────────────────────────────────────────────────────
  function handleDragStart(e, enrollmentId) {
    setDragId(enrollmentId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, colId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(colId)
  }

  function handleDrop(e, colId) {
    e.preventDefault()
    if (!dragId) return
    const col = KANBAN_COLS.find(c => c.id === colId)
    if (!col) return
    // Default to first stage in the column
    const newStage = ID_TO_STAGE[col.stageIds[0]]
    onStageChange?.(dragId, newStage)
    setDragId(null)
    setDropTarget(null)
  }

  // ── Filter enrollments ─────────────────────────────────────────────────────
  const filtered = enrollments.filter(e => {
    if (filter.provId && e.provId !== filter.provId) return false
    if (filter.payId && e.payId !== filter.payId) return false
    if (filter.followupOnly && !e.followup) return false
    if (filter.search) {
      const prov = providers.find(p => p.id === e.provId)
      const payer = payers.find(p => p.id === e.payId)
      const term = filter.search.toLowerCase()
      const haystack = [
        prov?.fname, prov?.lname, payer?.name, e.stage,
      ].join(' ').toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })

  // ── Bucket into columns ────────────────────────────────────────────────────
  function cardsForCol(col) {
    return filtered.filter(e => col.stageIds.includes(STAGE_TO_ID[e.stage]))
  }

  // ── Stats bar ──────────────────────────────────────────────────────────────
  const stats = {
    total: enrollments.length,
    active: enrollments.filter(e => e.stage === 'Active').length,
    pending: enrollments.filter(e => ['Application Submitted','Awaiting CAQH','Pending Verification','Under Review'].includes(e.stage)).length,
    followup: enrollments.filter(e => e.followup && daysUntil(e.followup) <= 3).length,
    denied: enrollments.filter(e => e.stage === 'Denied').length,
  }

  return (
    <div style={{ fontFamily: "'Geist', system-ui, sans-serif", color: '#e2e8f0' }}>
      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Enrollments', value: stats.total, color: '#3b82f6' },
          { label: 'Active',            value: stats.active, color: '#4ade80' },
          { label: 'In Pipeline',       value: stats.pending, color: '#f59e0b' },
          { label: 'Follow-up Urgent',  value: stats.followup, color: '#ef4444' },
          { label: 'Denied',            value: stats.denied, color: '#6b7280' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8,
            padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <FilterBar providers={providers} payers={payers} filter={filter} setFilter={setFilter} />
      </div>

      {/* ── Board ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
        {KANBAN_COLS.map(col => (
          <KanbanColumn
            key={col.id}
            col={col}
            cards={cardsForCol(col)}
            providers={providers}
            payers={payers}
            onOpen={onOpen}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            dropTarget={dropTarget}
          />
        ))}
      </div>

      {/* ── Quick Stage Menu ───────────────────────────────────────────────── */}
      {quickMenu && (
        <QuickStageMenu
          enrollment={quickMenu}
          onStageChange={onStageChange}
          onClose={() => setQuickMenu(null)}
        />
      )}
    </div>
  )
}
