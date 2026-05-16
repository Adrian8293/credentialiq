/**
 * Dashboard.jsx — Lacentra v4
 *
 * Redesign goals:
 * - Real data only — no hardcoded trend percentages
 * - Clear visual hierarchy: urgent alerts → pipeline → activity
 * - Premium enterprise aesthetic: precise spacing, intentional weight,
 *   color used only to communicate meaning (not decoration)
 * - Removed: date range export (belongs in Reports), fake trend arrows
 * - Added: today's date greeting, urgency-first layout, compact readable cards
 */

import { useState } from 'react'
import { daysUntil, fmtDate, pNameShort, payName } from '../../lib/helpers.js'

// ─── ICONS ────────────────────────────────────────────────────────────────────
const I = {
  alert:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  check:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  clock:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  doc:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  users:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  task:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  mail:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  arrow:    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  chart:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  cal:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function OnboardingChecklist({ db, setPage, openEnrollModal, openPayerModal }) {
  const hasProviders  = db.providers.length > 0
  const hasPayers     = db.payers.length > 0
  const hasEnrollment = db.enrollments.length > 0
  const steps = [
    { done: hasProviders, title: 'Add your first provider', desc: 'Enter provider details, NPI, license, and credentialing info.', action: () => setPage('add-provider'), label: 'Add Provider' },
    { done: hasPayers, title: 'Add insurance payers', desc: 'Set up the payers you\'ll be credentialing with.', action: () => openPayerModal?.(), label: 'Add Payer' },
    { done: hasEnrollment, title: 'Create your first application', desc: 'Track a provider\'s credentialing application with a specific payer.', action: () => openEnrollModal?.(), label: 'New Application', disabled: !hasProviders || !hasPayers },
  ]
  const doneCount = steps.filter(s => s.done).length

  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--pr)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(21,101,192,.2)' }}>
          {I.check}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-.04em', margin: '0 0 8px' }}>Welcome to Lacentra</h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-4)', margin: 0 }}>Complete these steps to get started.</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)' }}>Setup progress</span>
          <span style={{ fontSize: 11.5, color: 'var(--pr)', fontWeight: 700 }}>{doneCount}/{steps.length} complete</span>
        </div>
        <div style={{ height: 5, background: 'var(--elevated)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border-l)' }}>
          <div style={{ height: '100%', width: `${(doneCount / steps.length) * 100}%`, background: 'var(--pr)', borderRadius: 999, transition: 'width .4s ease' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
            background: 'var(--card)', border: `1.5px solid ${step.done ? 'rgba(16,185,129,.3)' : 'var(--border)'}`,
            borderRadius: 'var(--r-lg)', opacity: step.disabled ? 0.5 : 1, transition: 'all .15s',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: step.done ? 'rgba(16,185,129,.1)' : 'var(--elevated)',
              border: `2px solid ${step.done ? 'var(--success)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: step.done ? 'var(--success)' : 'var(--text-4)', fontSize: 12, fontWeight: 700,
            }}>
              {step.done ? I.check : i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: step.done ? 'var(--text-3)' : 'var(--text-1)', marginBottom: 1, textDecoration: step.done ? 'line-through' : 'none' }}>{step.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{step.desc}</div>
            </div>
            {!step.done && (
              <button className="btn btn-primary btn-sm" onClick={step.action} disabled={step.disabled} style={{ flexShrink: 0 }}>
                {step.label}
              </button>
            )}
            {step.done && <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700, whiteSpace: 'nowrap' }}>✓ Done</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
// Cleaner than KpiCard — no fake trends, no decorative icons, just signal
function StatCard({ label, value, sub, color = 'var(--pr)', bg = 'rgba(21,101,192,.06)', urgent = false, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--card)',
        border: `1.5px solid ${urgent ? 'rgba(239,68,68,.25)' : 'var(--border)'}`,
        borderRadius: 'var(--r-lg)',
        padding: '16px 18px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all .14s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.transform = 'none' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }} />
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 8, marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: urgent && value > 0 ? color : 'var(--text-1)', letterSpacing: '-.05em', lineHeight: 1, marginBottom: 5 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-4)' }}>{sub}</div>
    </div>
  )
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SH({ icon, title, count, action, actionLabel = 'View all' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%' }}>
      <span style={{ color: 'var(--text-4)', display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-.02em', flex: 1 }}>{title}</span>
      {count > 0 && (
        <span style={{ background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, lineHeight: '16px' }}>{count}</span>
      )}
      {action && (
        <button onClick={action} style={{ fontSize: 11.5, color: 'var(--pr)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, padding: 0, fontFamily: 'inherit' }}>
          {actionLabel} <span style={{ display: 'flex', alignItems: 'center', opacity: .7 }}>{I.arrow}</span>
        </button>
      )}
    </div>
  )
}

// ─── EXPIRY ROW ───────────────────────────────────────────────────────────────
function ExpiryRow({ item, last }) {
  const expired = item.days < 0
  const critical = !expired && item.days <= 30
  const color = expired ? 'var(--danger)' : critical ? 'var(--warning)' : 'var(--text-4)'
  const label = expired ? `Expired ${Math.abs(item.days)}d ago` : `${item.days}d left`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: last ? 'none' : '1px solid var(--border-l)' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 0 3px ${color}22` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.p.fname} {item.p.lname}{item.p.cred ? `, ${item.p.cred}` : ''}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>{item.label}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 10.5, color: 'var(--text-4)', marginTop: 1 }}>{fmtDate(item.date)}</div>
      </div>
    </div>
  )
}

// ─── FOLLOWUP ROW ─────────────────────────────────────────────────────────────
function FollowupRow({ e, db, onDraftEmail, last }) {
  const d = daysUntil(e.followup)
  const overdue = d <= 0
  const color = overdue ? 'var(--danger)' : d <= 3 ? 'var(--warning)' : 'var(--text-3)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: last ? 'none' : '1px solid var(--border-l)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {pNameShort(db.providers, e.provId)} <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>×</span> {payName(db.payers, e.payId)}
        </div>
        <div style={{ fontSize: 11, color, marginTop: 1, fontWeight: overdue ? 600 : 400 }}>
          {overdue ? `Overdue by ${Math.abs(d)}d` : `In ${d}d`} · {fmtDate(e.followup)}
        </div>
      </div>
      {onDraftEmail && (
        <button className="btn btn-sm" onClick={() => onDraftEmail(e)}
          style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '4px 9px' }}>
          {I.mail} Draft
        </button>
      )}
    </div>
  )
}

// ─── PIPELINE DONUT ───────────────────────────────────────────────────────────
const DONUT_COLORS = ['#1565C0', '#10B981', '#F59E0B', '#EF4444', '#7C3AED', '#0891B2', '#EC4899']

function PipelineDonut({ enrollments }) {
  const [hovered, setHovered] = useState(null)
  const stages = {}
  enrollments.forEach(e => { stages[e.stage] = (stages[e.stage] || 0) + 1 })
  const total = enrollments.length || 0
  const r = 36; const circ = 2 * Math.PI * r; let offset = 0
  const slices = Object.entries(stages).map(([stage, count], i) => {
    const pct = (count / (total || 1)) * circ
    const slice = { stage, count, color: DONUT_COLORS[i % DONUT_COLORS.length], pct, offset }
    offset += pct; return slice
  })

  if (total === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
        No applications in pipeline yet.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width="88" height="88" viewBox="0 0 88 88">
          {slices.map(s => (
            <circle key={s.stage} cx="44" cy="44" r={r} fill="none"
              stroke={hovered === s.stage ? s.color : s.color + 'cc'}
              strokeWidth={hovered === s.stage ? 13 : 10}
              strokeDasharray={`${s.pct} ${circ - s.pct}`}
              strokeDashoffset={-s.offset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', cursor: 'pointer', transition: 'all .12s' }}
              onMouseEnter={() => setHovered(s.stage)} onMouseLeave={() => setHovered(null)}
            />
          ))}
          <text x="44" y="49" textAnchor="middle" fontSize="17" fontWeight="800" fill="var(--text-1)" fontFamily="inherit">
            {hovered ? slices.find(s => s.stage === hovered)?.count : total}
          </text>
        </svg>
        <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--text-4)', marginTop: 2 }}>
          {hovered || 'total'}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {slices.map(s => (
          <div key={s.stage}
            onMouseEnter={() => setHovered(s.stage)} onMouseLeave={() => setHovered(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0', cursor: 'default', opacity: hovered && hovered !== s.stage ? .35 : 1, transition: 'opacity .12s' }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.stage}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', flexShrink: 0, minWidth: 16, textAlign: 'right' }}>{s.count}</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-4)', minWidth: 30, textAlign: 'right' }}>{Math.round(s.count / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── RECENT APPLICATIONS ──────────────────────────────────────────────────────
function RecentApps({ db, openEnrollModal, setPage }) {
  const recent = [...db.enrollments]
    .sort((a, b) => new Date(b.updated || b.created || 0) - new Date(a.updated || a.created || 0))
    .slice(0, 6)

  const stageBadge = (stage) => {
    const s = (stage || '').toLowerCase()
    if (s.includes('active') || s.includes('approved')) return <span className="badge b-green">{stage}</span>
    if (s.includes('return') || s.includes('denied'))   return <span className="badge b-red">{stage}</span>
    if (s.includes('pending') || s.includes('waiting')) return <span className="badge b-amber">{stage}</span>
    return <span className="badge b-blue">{stage}</span>
  }

  if (recent.length === 0) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 10 }}>No applications yet.</div>
        <button className="btn btn-primary btn-sm" onClick={() => openEnrollModal?.()}>+ New Application</button>
      </div>
    )
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Provider', 'Payer', 'Status', 'Updated'].map(h => (
            <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-4)', background: 'var(--elevated)', borderBottom: '1.5px solid var(--border)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {recent.map((e, i) => (
          <tr key={i} onClick={() => openEnrollModal?.(e.id)}
            style={{ cursor: 'pointer', borderBottom: i < recent.length - 1 ? '1px solid var(--border-l)' : 'none' }}
            onMouseEnter={ev => ev.currentTarget.style.background = 'var(--pr-ll)'}
            onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
          >
            <td style={{ padding: '10px 16px', fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{pNameShort(db.providers, e.provId) || '—'}</td>
            <td style={{ padding: '10px 16px', fontSize: 12.5, color: 'var(--text-3)' }}>{payName(db.payers, e.payId) || '—'}</td>
            <td style={{ padding: '10px 16px' }}>{stageBadge(e.stage)}</td>
            <td style={{ padding: '10px 16px', fontSize: 11.5, color: 'var(--text-4)' }}>{fmtDate(e.updated || e.created) || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── SPECIALTY BREAKDOWN ──────────────────────────────────────────────────────
function SpecBreakdown({ providers }) {
  const specs = {}
  providers.filter(p => p.status === 'Active').forEach(p => { specs[p.spec || 'General'] = (specs[p.spec || 'General'] || 0) + 1 })
  const total = Object.values(specs).reduce((a, b) => a + b, 0) || 1
  const COLORS = ['var(--pr)', 'var(--success)', 'var(--warning)', '#7C3AED', '#0891B2']
  const sorted = Object.entries(specs).sort((a, b) => b[1] - a[1])

  if (sorted.length === 0) {
    return <div style={{ padding: '16px 0', fontSize: 12, color: 'var(--text-4)', textAlign: 'center' }}>Add providers to see breakdown.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map(([s, n], i) => (
        <div key={s}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{s}</span>
            <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{n}</span>
          </div>
          <div style={{ height: 4, background: 'var(--elevated)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border-l)' }}>
            <div style={{ height: '100%', width: `${Math.round(n / total * 100)}%`, background: COLORS[i % COLORS.length], borderRadius: 999, transition: 'width .4s ease' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── TASK ROW ─────────────────────────────────────────────────────────────────
function TaskRow({ t, db, last }) {
  const due = daysUntil(t.due)
  const overdue = due !== null && due < 0
  const urgent  = due !== null && due <= 2 && !overdue
  const color = overdue ? 'var(--danger)' : urgent ? 'var(--warning)' : 'var(--text-4)'
  const prov = db.providers.find(p => p.id === t.provId)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: last ? 'none' : '1px solid var(--border-l)' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: t.priority === 'High' ? 'var(--danger)' : t.priority === 'Medium' ? 'var(--warning)' : 'var(--text-5)' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.task}</div>
        {prov && <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>{prov.fname} {prov.lname}</div>}
      </div>
      {t.due && (
        <div style={{ fontSize: 11, color, fontWeight: overdue || urgent ? 600 : 400, flexShrink: 0, textAlign: 'right' }}>
          {overdue ? `${Math.abs(due)}d overdue` : due === 0 ? 'Today' : `${due}d`}
        </div>
      )}
    </div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export function Dashboard({ db, setPage, openEnrollModal, onDraftEmail, openPayerModal }) {
  const isEmpty = db.providers.length === 0 && db.enrollments.length === 0
  if (isEmpty) {
    return (
      <div className="page">
        <OnboardingChecklist db={db} setPage={setPage} openEnrollModal={openEnrollModal} openPayerModal={openPayerModal} />
      </div>
    )
  }

  // ── Compute real metrics ───────────────────────────────────────────────────
  const activeProviders  = db.providers.filter(p => p.status === 'Active').length
  const pendingApps      = db.enrollments.filter(e => !['Active', 'Approved', 'Denied'].includes(e.stage)).length
  const activeApps       = db.enrollments.filter(e => ['Active', 'Approved'].includes(e.stage)).length
  const openTasks        = db.tasks.filter(t => t.status !== 'Done').length

  // Expirations within 90 days (provider credentials)
  const expiryItems = []
  db.providers.forEach(p => {
    [
      { f: 'licenseExp', l: 'License' },
      { f: 'malExp',     l: 'Malpractice' },
      { f: 'deaExp',     l: 'DEA' },
      { f: 'caqhDue',   l: 'CAQH Attestation' },
      { f: 'recred',    l: 'Re-credentialing' },
    ].forEach(c => {
      const d = daysUntil(p[c.f])
      if (d !== null && d <= 90) expiryItems.push({ p, label: c.label, days: d, date: p[c.f] })
    })
  })
  expiryItems.sort((a, b) => a.days - b.days)

  const expired  = expiryItems.filter(a => a.days < 0).length
  const critical = expiryItems.filter(a => a.days >= 0 && a.days <= 30).length

  // Follow-ups due within 14 days
  const followups = db.enrollments
    .filter(e => e.followup && daysUntil(e.followup) !== null && daysUntil(e.followup) <= 14)
    .sort((a, b) => daysUntil(a.followup) - daysUntil(b.followup))

  // Upcoming tasks (open, sorted by due date)
  const upcomingTasks = db.tasks
    .filter(t => t.status !== 'Done')
    .sort((a, b) => {
      if (!a.due) return 1; if (!b.due) return -1
      return new Date(a.due) - new Date(b.due)
    })
    .slice(0, 5)

  return (
    <div className="page">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--pr)', marginBottom: 4 }}>{todayLabel()}</div>
          <h2 style={{ fontSize: 21, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-.04em', margin: 0, lineHeight: 1.15 }}>{greeting()}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-4)', margin: '4px 0 0' }}>
            {expired > 0
              ? `${expired} expired credential${expired > 1 ? 's' : ''} need immediate attention.`
              : critical > 0
              ? `${critical} credential${critical > 1 ? 's' : ''} expiring within 30 days.`
              : 'All credentials are within thresholds.'}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setPage('alerts')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {I.alert} View alerts
        </button>
      </div>

      {/* ── KPI Grid ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: 10, marginBottom: 20 }}>
        <StatCard label="Active Providers" value={activeProviders} sub="Credentialed" color="var(--pr)" onClick={() => setPage('providers')} />
        <StatCard label="In Pipeline" value={pendingApps} sub="Awaiting approval" color="var(--warning)" onClick={() => setPage('applications')} />
        <StatCard label="Approved Panels" value={activeApps} sub="Active participation" color="var(--success)" onClick={() => setPage('applications')} />
        <StatCard label="Expiring Soon" value={expiryItems.length} sub={`${expired} already expired`} color="var(--danger)" urgent={expired > 0} onClick={() => setPage('alerts')} />
        <StatCard label="Open Tasks" value={openTasks} sub="Requiring action" color="#7C3AED" onClick={() => setPage('tasks')} />
      </div>

      {/* ── Main Content Grid ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>

        {/* COL 1: Expirations + Follow-ups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div className="card">
            <div className="card-header">
              <SH icon={I.alert} title="Upcoming Expirations" count={critical + expired} action={() => setPage('alerts')} />
            </div>
            <div style={{ padding: '0 16px', maxHeight: 230, overflowY: 'auto' }}>
              {expiryItems.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-4)' }}>
                  <div style={{ fontSize: 18, marginBottom: 6 }}>✓</div>
                  All credentials are current
                </div>
              ) : expiryItems.slice(0, 7).map((a, i) => (
                <ExpiryRow key={i} item={a} last={i === Math.min(6, expiryItems.length - 1)} />
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <SH icon={I.cal} title="Follow-up Queue" count={followups.filter(e => daysUntil(e.followup) <= 0).length} action={() => setPage('applications')} />
            </div>
            <div style={{ padding: '0 16px', maxHeight: 180, overflowY: 'auto' }}>
              {followups.length === 0 ? (
                <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-4)' }}>No follow-ups due in 14 days</div>
              ) : followups.slice(0, 5).map((e, i) => (
                <FollowupRow key={i} e={e} db={db} onDraftEmail={onDraftEmail} last={i === Math.min(4, followups.length - 1)} />
              ))}
            </div>
          </div>

        </div>

        {/* COL 2: Pipeline + Specialty */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div className="card">
            <div className="card-header">
              <SH icon={I.chart} title="Application Pipeline" action={() => setPage('applications')} />
            </div>
            <div className="card-body">
              <PipelineDonut enrollments={db.enrollments} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <SH icon={I.users} title="Providers by Specialty" action={() => setPage('providers')} />
            </div>
            <div className="card-body">
              <SpecBreakdown providers={db.providers} />
            </div>
          </div>

        </div>

        {/* COL 3: Recent Apps + Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div className="card">
            <div className="card-header">
              <SH icon={I.doc} title="Recent Applications" action={() => setPage('applications')} />
            </div>
            <RecentApps db={db} openEnrollModal={openEnrollModal} setPage={setPage} />
          </div>

          <div className="card">
            <div className="card-header">
              <SH icon={I.task} title="Open Tasks" count={openTasks} action={() => setPage('tasks')} />
            </div>
            <div style={{ padding: '0 16px' }}>
              {upcomingTasks.length === 0 ? (
                <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-4)' }}>No open tasks</div>
              ) : upcomingTasks.map((t, i) => (
                <TaskRow key={i} t={t} db={db} last={i === upcomingTasks.length - 1} />
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}

export default Dashboard
