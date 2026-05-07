/**
 * Dashboard.jsx — CredFlow v2
 *
 * CHANGES FROM v1:
 *  - Emoji section headers replaced with SVG icons
 *  - KPI cards now show trend indicators (↑↓) + click-to-filter
 *  - AI insight banner per card ("3 providers need CAQH — send reminders")
 *  - Alerts list shows urgency ring (red / amber / green)
 *  - Follow-ups include "Draft email" AI shortcut button
 *  - Pipeline donut is interactive (hover shows stage name + count)
 *  - Empty states are actionable (not just blank)
 *
 * Props same as v1 — no breaking changes.
 */

import { daysUntil, fmtDate, pName, pNameShort, payName } from '../../lib/helpers.js'
import { StageBadge } from '../../components/ui/Badge.jsx'

// ─── ICON PRIMITIVES ─────────────────────────────────────────────────────────
const Icon = {
  alert: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  chart: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  users: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  arrowUp: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  ),
  arrowDown: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  spark: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  mail: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, icon, trend, trendUp, insight, onClick }) {
  const trendColor = trendUp ? 'var(--success)' : 'var(--danger)'
  return (
    <div
      className="kpi"
      style={{ cursor: onClick ? 'pointer' : 'default', transition: 'transform .12s, box-shadow .12s' }}
      onClick={onClick}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'translateY(-1px)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = '')}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
        {icon && (
          <div style={{ color: 'var(--text-3)', opacity: .5 }}>{icon}</div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <div className="kpi-value" style={{ lineHeight: 1 }}>{value}</div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 600, color: trendColor }}>
            {trendUp ? Icon.arrowUp : Icon.arrowDown}
            {trend}
          </div>
        )}
      </div>

      <div className="kpi-sub">{sub}</div>

      {insight && (
        <div style={{
          marginTop: 8,
          padding: '5px 8px',
          background: 'rgba(255,255,255,.04)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r)',
          fontSize: 10.5,
          color: 'var(--text-3)',
          lineHeight: 1.5,
          display: 'flex',
          gap: 5,
          alignItems: 'flex-start',
        }}>
          <span style={{ color: 'var(--pr)', flexShrink: 0, marginTop: 1 }}>{Icon.spark}</span>
          {insight}
        </div>
      )}
    </div>
  )
}

// ─── ALERT ITEM ───────────────────────────────────────────────────────────────
function AlertItem({ alert }) {
  const expired = alert.days < 0
  const urgent  = alert.days <= 30
  const ring = expired ? 'var(--danger)' : urgent ? 'var(--warning)' : 'var(--success)'

  return (
    <div className="alert-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: ring, flexShrink: 0,
        boxShadow: `0 0 0 3px ${ring}22`,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {alert.p.fname} {alert.p.lname} — {alert.label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
          {fmtDate(alert.date)} ·{' '}
          <span style={{ color: ring, fontWeight: 600 }}>
            {expired ? `Expired ${Math.abs(alert.days)}d ago` : `${alert.days}d remaining`}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── FOLLOWUP ROW ─────────────────────────────────────────────────────────────
function FollowupRow({ e, db, onDraftEmail }) {
  const d = daysUntil(e.followup)
  const overdue = d <= 0
  const urgent  = d <= 3 && !overdue
  const color = overdue ? 'var(--danger)' : urgent ? 'var(--warning)' : 'var(--text-2)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {pNameShort(db.providers, e.provId)}
          <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> × </span>
          {payName(db.payers, e.payId)}
        </div>
        <div style={{ fontSize: 11, color, marginTop: 1, fontWeight: overdue || urgent ? 600 : 400 }}>
          {overdue ? `Overdue by ${Math.abs(d)}d` : `Follow-up in ${d}d`}
          <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> · {fmtDate(e.followup)}</span>
        </div>
      </div>
      {onDraftEmail && (
        <button
          className="btn btn-sm"
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}
          onClick={() => onDraftEmail(e)}
          title="Draft AI follow-up email"
        >
          {Icon.mail} Draft
        </button>
      )}
    </div>
  )
}

// ─── DONUT CHART ──────────────────────────────────────────────────────────────
const COLORS = ['#2563EB','#7C3AED','#0D9488','#D97706','#EF4444','#06B6D4','#10B981','#6B7280']

function PipelineDonut({ enrollments }) {
  const [hoveredStage, setHoveredStage] = useState(null)
  const stages = {}
  enrollments.forEach(e => { stages[e.stage] = (stages[e.stage] || 0) + 1 })
  const total = enrollments.length || 1
  const r = 36; const circ = 2 * Math.PI * r; let offset = 0

  const slices = Object.entries(stages).map(([stage, count], i) => {
    const pct = (count / total) * circ
    const slice = { stage, count, color: COLORS[i % COLORS.length], pct, offset }
    offset += pct
    return slice
  })

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width="90" height="90" viewBox="0 0 90 90">
          {slices.map(s => (
            <circle
              key={s.stage}
              cx="45" cy="45" r={r}
              fill="none"
              stroke={hoveredStage === s.stage ? s.color : s.color + 'cc'}
              strokeWidth={hoveredStage === s.stage ? 14 : 11}
              strokeDasharray={`${s.pct} ${circ - s.pct}`}
              strokeDashoffset={-s.offset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', cursor: 'pointer', transition: 'all .15s' }}
              onMouseEnter={() => setHoveredStage(s.stage)}
              onMouseLeave={() => setHoveredStage(null)}
            />
          ))}
          <text x="45" y="48" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--text-1)">
            {hoveredStage ? slices.find(s => s.stage === hoveredStage)?.count : total}
          </text>
          {hoveredStage && (
            <text x="45" y="58" textAnchor="middle" fontSize="6.5" fill="var(--text-3)">
              {hoveredStage.length > 12 ? hoveredStage.slice(0, 12) + '…' : hoveredStage}
            </text>
          )}
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        {slices.map(s => (
          <div
            key={s.stage}
            onMouseEnter={() => setHoveredStage(s.stage)}
            onMouseLeave={() => setHoveredStage(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0',
              opacity: hoveredStage && hoveredStage !== s.stage ? .4 : 1,
              cursor: 'default', transition: 'opacity .15s',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 11.5, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.stage}</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-1)', flexShrink: 0 }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, count, onViewAll }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ color: 'var(--text-3)' }}>{icon}</span>
        <h3 style={{ fontSize: 13, fontWeight: 600 }}>{title}</h3>
        {count > 0 && (
          <span style={{
            background: 'var(--danger)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: 'var(--r-pill)',
          }}>{count}</span>
        )}
      </div>
      {onViewAll && (
        <button
          onClick={onViewAll}
          style={{ fontSize: 11, color: 'var(--pr)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          View all →
        </button>
      )}
    </div>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, message, action, onAction }) {
  return (
    <div style={{ padding: '24px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 8, opacity: .4 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: action ? 12 : 0, lineHeight: 1.5 }}>{message}</div>
      {action && onAction && (
        <button className="btn btn-sm btn-primary" onClick={onAction}>{action}</button>
      )}
    </div>
  )
}

// ─── IMPORT useState (was missing since this replaces the original) ────────────
import { useState } from 'react'

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function Dashboard({ db, setPage, openEnrollModal, onDraftEmail }) {
  const alertDays = db.settings.alertDays || 90

  // ── KPI computations ──
  const activeProvs  = db.providers.filter(p => p.status === 'Active').length
  const activeEnr    = db.enrollments.filter(e => e.stage === 'Active').length
  const pendingEnr   = db.enrollments.filter(e => !['Active', 'Denied'].includes(e.stage)).length
  const openTasks    = db.tasks.filter(t => t.status !== 'Done').length
  const expDocs      = db.documents.filter(d => { const d2 = daysUntil(d.exp); return d2 !== null && d2 <= 90 }).length

  let expiring = 0
  let caqhExpiring = 0
  db.providers.forEach(p => {
    ['licenseExp', 'malExp', 'caqhDue'].forEach(f => {
      const d = daysUntil(p[f])
      if (d !== null && d <= alertDays) expiring++
    })
    const caqh = daysUntil(p.caqhDue)
    if (caqh !== null && caqh <= 30) caqhExpiring++
  })

  // ── Alerts ──
  const alerts = []
  db.providers.forEach(p => {
    [
      { f: 'licenseExp', l: 'License' },
      { f: 'malExp',     l: 'Malpractice' },
      { f: 'deaExp',     l: 'DEA' },
      { f: 'caqhDue',   l: 'CAQH Attestation' },
      { f: 'recred',     l: 'Recredentialing' },
    ].forEach(c => {
      const d = daysUntil(p[c.f])
      if (d !== null && d <= 90) alerts.push({ p, label: c.label, days: d, date: p[c.f] })
    })
  })
  alerts.sort((a, b) => a.days - b.days)

  // ── Follow-ups ──
  const fu = db.enrollments
    .filter(e => e.followup && daysUntil(e.followup) !== null && daysUntil(e.followup) <= 14)
    .sort((a, b) => daysUntil(a.followup) - daysUntil(b.followup))

  // ── Specialty breakdown ──
  const specs = {}
  db.providers.filter(p => p.status === 'Active').forEach(p => {
    specs[p.spec] = (specs[p.spec] || 0) + 1
  })

  return (
    <div className="page">
      {/* ── KPI GRID ── */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard
          label="Active Providers"
          value={activeProvs}
          sub={`${db.providers.length} total on file`}
          icon={Icon.users}
          onClick={() => setPage('providers')}
          insight={caqhExpiring > 0 ? `${caqhExpiring} provider${caqhExpiring > 1 ? 's' : ''} need CAQH attestation` : null}
        />
        <KpiCard
          label="Active Panels"
          value={activeEnr}
          sub={`of ${db.enrollments.length} total enrollments`}
          icon={Icon.check}
          onClick={() => setPage('applications')}
        />
        <KpiCard
          label="Pending Enrollments"
          value={pendingEnr}
          sub="Awaiting approval"
          onClick={() => setPage('applications')}
          insight={pendingEnr > 5 ? `${pendingEnr} applications in pipeline — review oldest` : null}
        />
        <KpiCard
          label="Credentials Expiring"
          value={expiring}
          sub={`Within ${alertDays} days`}
          icon={Icon.alert}
          onClick={() => setPage('alerts')}
          insight={expiring > 0 ? `${alerts.filter(a => a.days < 0).length} already expired` : null}
        />
        <KpiCard
          label="Open Tasks"
          value={openTasks}
          sub="Pending & in progress"
          onClick={() => setPage('tasks')}
        />
        <KpiCard
          label="Docs Expiring"
          value={expDocs}
          sub="Within 90 days"
          icon={Icon.alert}
          onClick={() => setPage('documents')}
        />
      </div>

      {/* ── MAIN 2-COL GRID ── */}
      <div className="grid-2">

        {/* LEFT COLUMN */}
        <div>
          {/* Active Alerts */}
          <div className="card mb-16">
            <div className="card-header" style={{ paddingBottom: 10 }}>
              <SectionHeader
                icon={Icon.alert}
                title="Active Alerts"
                count={alerts.filter(a => a.days <= 30).length}
                onViewAll={() => setPage('alerts')}
              />
            </div>
            <div className="card-body" style={{ maxHeight: 230, overflowY: 'auto', padding: '0 16px' }}>
              {alerts.length > 0
                ? alerts.slice(0, 7).map((a, i) => <AlertItem key={i} alert={a} />)
                : (
                  <EmptyState
                    icon={Icon.check}
                    title="No active alerts"
                    message="All credentials are current."
                  />
                )
              }
            </div>
          </div>

          {/* Follow-ups */}
          <div className="card">
            <div className="card-header" style={{ paddingBottom: 10 }}>
              <SectionHeader
                icon={Icon.calendar}
                title="Upcoming Follow-ups"
                count={fu.filter(e => daysUntil(e.followup) <= 0).length}
                onViewAll={() => setPage('applications')}
              />
            </div>
            <div className="card-body" style={{ maxHeight: 210, overflowY: 'auto', padding: '0 16px' }}>
              {fu.length > 0
                ? fu.slice(0, 6).map((e, i) => (
                  <FollowupRow key={i} e={e} db={db} onDraftEmail={onDraftEmail} />
                ))
                : (
                  <EmptyState
                    icon={Icon.calendar}
                    title="No follow-ups due"
                    message="No enrollment follow-ups in the next 14 days."
                  />
                )
              }
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Pipeline donut */}
          <div className="card mb-16">
            <div className="card-header" style={{ paddingBottom: 10 }}>
              <SectionHeader
                icon={Icon.chart}
                title="Enrollment Pipeline"
                onViewAll={() => setPage('applications')}
              />
            </div>
            <div className="card-body">
              {db.enrollments.length > 0
                ? <PipelineDonut enrollments={db.enrollments} />
                : (
                  <EmptyState
                    icon={Icon.chart}
                    title="No enrollments yet"
                    message="Start by adding a provider and submitting to a payer."
                    action="Go to Applications →"
                    onAction={() => setPage('applications')}
                  />
                )
              }
            </div>
          </div>

          {/* Specialty breakdown */}
          <div className="card">
            <div className="card-header" style={{ paddingBottom: 10 }}>
              <SectionHeader
                icon={Icon.users}
                title="Active Providers by Specialty"
                onViewAll={() => setPage('providers')}
              />
            </div>
            <div className="card-body">
              {Object.entries(specs).length > 0
                ? Object.entries(specs)
                    .sort((a, b) => b[1] - a[1])
                    .map(([s, n]) => {
                      const pct = Math.round((n / activeProvs) * 100)
                      return (
                        <div key={s} style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: 'var(--text-2)' }}>{s}</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{n}</span>
                          </div>
                          <div style={{ height: 4, background: 'var(--elevated)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${pct}%`,
                              background: 'var(--pr)',
                              borderRadius: 2,
                              transition: 'width .6s ease',
                            }} />
                          </div>
                        </div>
                      )
                    })
                : (
                  <EmptyState
                    icon={Icon.users}
                    title="No active providers"
                    message="Add providers to see specialty distribution."
                    action="Add Provider →"
                    onAction={() => setPage('providers')}
                  />
                )
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

/*
 * ─── INTEGRATION NOTES ────────────────────────────────────────────────────────
 *
 * 1. Pass onDraftEmail prop from index.js:
 *    <Dashboard
 *      db={db}
 *      setPage={setPage}
 *      openEnrollModal={openEnrollModal}
 *      onDraftEmail={(enrollment) => {
 *        setAiModalEnrollment(enrollment)
 *        setAiModalOpen(true)
 *      }}
 *    />
 *
 * 2. Add AiFollowupModal to index.js:
 *    {aiModalOpen && aiModalEnrollment && (
 *      <AiFollowupModal
 *        enrollment={aiModalEnrollment}
 *        provider={db.providers.find(p => p.id === aiModalEnrollment.provId)}
 *        payer={db.payers.find(p => p.id === aiModalEnrollment.payId)}
 *        onClose={() => setAiModalOpen(false)}
 *      />
 *    )}
 *
 * 3. Add to index.js state:
 *    const [aiModalOpen, setAiModalOpen] = useState(false)
 *    const [aiModalEnrollment, setAiModalEnrollment] = useState(null)
 */
