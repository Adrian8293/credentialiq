/**
 * Reports.jsx — PrimeCredential
 * Analytics overview with KPI metrics, charts, trend reporting,
 * application breakdowns, provider stats, payer analysis, turnaround time.
 */

import { useState } from 'react'
import { daysUntil, payName, pName } from '../../lib/helpers.js'
import { Badge, StageBadge } from '../../components/ui/Badge.jsx'
import { STATUS_COLOR } from '../../constants/stages.js'

const Icon = {
  chart:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  shield:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  check:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  payers:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  download: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  users:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  file:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  calendar: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  clock:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  bolt:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  archive:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  trend:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
}

const COLORS = ['#1E56F0','#10B981','#F59E0B','#7C3AED','#EF4444','#0891B2','#E11D48','#0D9488']

function SH({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--pr)' }}>{icon}</span>
      <h3 style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{title}</h3>
    </div>
  )
}

function BigStat({ value, suffix = '%', color = 'var(--pr)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 6 }}>
      <span style={{ fontSize: 40, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-2px' }}>{value}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color }}>{suffix}</span>
    </div>
  )
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ height: 6, background: 'var(--elevated)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border-l)' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 4, transition: 'width .5s ease' }} />
    </div>
  )
}

// Inline bar chart
function BarChart({ data, maxVal, colorFn }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, paddingBottom: 20, position: 'relative' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '80%', background: colorFn ? colorFn(i) : 'var(--pr)', borderRadius: '4px 4px 0 0', height: `${maxVal > 0 ? (d.val / maxVal) * 75 : 0}px`, minHeight: d.val > 0 ? 3 : 0, transition: 'height .4s' }} />
          <div style={{ fontSize: 8.5, color: 'var(--text-4)', marginTop: 4, whiteSpace: 'nowrap', position: 'absolute', bottom: 0 }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

// Donut ring
function MiniDonut({ data, total }) {
  const r = 34; const circ = 2 * Math.PI * r; let offset = 0
  const slices = data.map((d, i) => {
    const pct = total > 0 ? (d.val / total) * circ : 0
    const s = { ...d, color: COLORS[i % COLORS.length], pct, offset }
    offset += pct; return s
  })
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
      {total === 0 ? <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border)" strokeWidth="10" /> :
        slices.map((s, i) => (
          <circle key={i} cx="40" cy="40" r={r} fill="none" stroke={s.color} strokeWidth="10"
            strokeDasharray={`${s.pct} ${circ - s.pct}`} strokeDashoffset={-s.offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
        ))}
      <text x="40" y="45" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--text-1)">{total}</text>
    </svg>
  )
}

const TABS = ['Overview', 'Applications', 'Providers', 'Payers', 'Turnaround Time']
const EXPORT_CARDS = [
  { icon: Icon.users,    title: 'Provider Roster',    desc: 'All providers with license & expiry details' },
  { icon: Icon.file,     title: 'Enrollment Status',  desc: 'All payer enrollments by current stage' },
  { icon: Icon.calendar, title: 'Expiration Report',  desc: 'Credentials expiring within 90 days' },
  { icon: Icon.bolt,     title: 'Open Tasks',         desc: 'All pending and in-progress tasks' },
  { icon: Icon.archive,  title: 'Full Data Backup',   desc: 'Export all PrimeCredential data as JSON' },
]

export function Reports({ db, exportJSON }) {
  const [activeTab, setActiveTab] = useState('Overview')
  const [dateRange, setDateRange] = useState('May 12 – Jun 10, 2024')
  const [groupBy, setGroupBy] = useState('Week')

  // Computed metrics
  const total = db.providers.length || 1
  const compliant = db.providers.filter(p => {
    const l = daysUntil(p.licenseExp); const m = daysUntil(p.malExp); const c = daysUntil(p.caqhDue)
    return (l === null || l > 0) && (m === null || m > 0) && (c === null || c > 0)
  }).length
  const compliancePct = Math.round((compliant / total) * 100)
  const complianceColor = compliancePct >= 80 ? 'var(--success)' : compliancePct >= 60 ? 'var(--warning)' : 'var(--danger)'

  const done = db.tasks.filter(t => t.status === 'Done').length
  const tTotal = db.tasks.length || 1
  const taskPct = Math.round((done / tTotal) * 100)
  const taskColor = taskPct >= 80 ? 'var(--success)' : taskPct >= 50 ? 'var(--warning)' : 'var(--danger)'

  const stages = {}
  db.enrollments.forEach(e => { stages[e.stage] = (stages[e.stage] || 0) + 1 })
  const totalEnr = db.enrollments.length
  const approvedEnr = db.enrollments.filter(e => ['Active','Approved'].includes(e.stage)).length
  const returnRate = totalEnr > 0 ? Math.round(db.enrollments.filter(e => ['Returned','Denied'].includes(e.stage)).length / totalEnr * 100) : 0
  const avgTAT = 28 // placeholder

  const panels = {}
  db.enrollments.filter(e => e.stage === 'Active').forEach(e => {
    const name = payName(db.payers, e.payId) || 'Unknown'
    panels[name] = (panels[name] || 0) + 1
  })
  const maxPanels = Math.max(...Object.values(panels), 1)

  // Mock weekly trend
  const weekData = ['May 12','May 19','May 26','Jun 2','Jun 9'].map((l, i) => ({
    label: l, val: [12, 19, 15, 22, 18][i]
  }))
  const maxWeek = Math.max(...weekData.map(d => d.val))

  // By payer donut data
  const payerData = Object.entries(panels).slice(0, 5).map(([name, val]) => ({ label: name, val }))
  const payerTotal = payerData.reduce((a, b) => a + b.val, 0)

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-.03em', marginBottom: 3 }}>Reports</h2>
          <p style={{ fontSize: 13, color: 'var(--text-4)' }}>Analyze performance and credentialing metrics across PrimeCredential.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={exportJSON} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {Icon.download} Export Report
        </button>
      </div>

      {/* Date + filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 500 }}>Date Range:</div>
        <select className="filter-select" style={{ fontSize: 12 }} value={dateRange} onChange={e => setDateRange(e.target.value)}>
          <option>May 12 – Jun 10, 2024</option>
          <option>Apr 1 – Apr 30, 2024</option>
          <option>Jan 1 – Mar 31, 2024</option>
        </select>
        <div style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 500 }}>Group By:</div>
        <select className="filter-select" style={{ fontSize: 12 }} value={groupBy} onChange={e => setGroupBy(e.target.value)}>
          <option>Week</option><option>Month</option><option>Quarter</option>
        </select>
      </div>

      <div className="tabs">
        {TABS.map(t => <div key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</div>)}
      </div>

      {activeTab === 'Overview' && (
        <>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
            {[
              { label: 'Total Applications', val: totalEnr, trend: '+18%', up: true, color: 'var(--pr)' },
              { label: 'Approved', val: approvedEnr, trend: '+12%', up: true, color: 'var(--success)' },
              { label: 'Avg Turnaround Time', val: `${avgTAT}d`, trend: '+8%', up: false, color: 'var(--warning)' },
              { label: 'Return Rate', val: `${returnRate}%`, trend: '-2%', up: true, color: returnRate > 15 ? 'var(--danger)' : 'var(--success)' },
            ].map((k, i) => (
              <div key={i} className="kpi" style={{ [`--kpi-accent`]: k.color }}>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value">{k.val}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: k.up ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                  {k.up ? '↑' : '↓'} {k.trend} vs previous period
                </div>
              </div>
            ))}
          </div>

          <div className="grid-2">
            {/* Applications Over Time */}
            <div className="card">
              <div className="card-header"><SH icon={Icon.trend} title="Applications Over Time" /></div>
              <div className="card-body">
                <BarChart data={weekData} maxVal={maxWeek} colorFn={i => COLORS[0]} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[0] }} />
                  <span style={{ fontSize: 11, color: 'var(--text-4)' }}>Applications submitted</span>
                </div>
              </div>
            </div>

            {/* Applications by Payer */}
            <div className="card">
              <div className="card-header"><SH icon={Icon.payers} title="Applications by Payer" /></div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <MiniDonut data={payerData} total={payerTotal} />
                  <div style={{ flex: 1 }}>
                    {payerData.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 11.5, color: 'var(--text-2)' }}>{d.label}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-1)' }}>{d.val}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{payerTotal > 0 ? Math.round(d.val/payerTotal*100) : 0}%</span>
                      </div>
                    ))}
                    {payerData.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-4)' }}>No active panels yet.</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            {/* Compliance Rate */}
            <div className="card">
              <div className="card-header"><SH icon={Icon.shield} title="Provider Compliance Rate" /></div>
              <div className="card-body">
                <BigStat value={compliancePct} suffix="%" color={complianceColor} />
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>{compliant} of {db.providers.length} providers fully compliant</div>
                <ProgressBar pct={compliancePct} color={complianceColor} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-4)', marginTop: 5 }}>
                  <span>0%</span><span style={{ fontWeight: 600, color: complianceColor }}>Target: 80%</span><span>100%</span>
                </div>
              </div>
            </div>

            {/* Task Completion */}
            <div className="card">
              <div className="card-header"><SH icon={Icon.check} title="Task Completion" /></div>
              <div className="card-body">
                <BigStat value={taskPct} suffix="%" color={taskColor} />
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>{done} of {db.tasks.length} tasks completed</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Open', 'In Progress', 'Waiting', 'Done'].map(s => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Badge cls={STATUS_COLOR?.[s] || 'b-gray'}>{s}</Badge>
                      <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-1)' }}>{db.tasks.filter(t => t.status === s).length}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'Applications' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
            {Object.entries(stages).map(([stage, count], i) => (
              <div key={stage} className="kpi" style={{ textAlign: 'center' }}>
                <div className="kpi-value" style={{ textAlign: 'center' }}>{count}</div>
                <div className="kpi-label">{stage}</div>
              </div>
            ))}
            {Object.entries(stages).length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '32px 0', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>No enrollment data yet.</div>
            )}
          </div>
          <div className="card">
            <div className="card-header"><SH icon={Icon.chart} title="Enrollment Pipeline Breakdown" /></div>
            <div className="card-body">
              {Object.entries(stages).sort((a, b) => b[1] - a[1]).map(([stage, count], i) => (
                <div key={stage} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                    <StageBadge stage={stage} />
                    <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{count}</span>
                  </div>
                  <ProgressBar pct={totalEnr > 0 ? Math.round(count/totalEnr*100) : 0} color={COLORS[i % COLORS.length]} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Providers' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><SH icon={Icon.users} title="Providers by Specialty" /></div>
            <div className="card-body">
              {(() => {
                const specs = {}
                db.providers.forEach(p => { specs[p.spec || 'General'] = (specs[p.spec || 'General'] || 0) + 1 })
                const total = Object.values(specs).reduce((a,b) => a+b, 0) || 1
                return Object.entries(specs).sort((a,b) => b[1]-a[1]).map(([s, n], i) => (
                  <div key={s} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-2)' }}>{s}</span>
                      <span style={{ fontWeight: 600 }}>{n} ({Math.round(n/total*100)}%)</span>
                    </div>
                    <ProgressBar pct={Math.round(n/total*100)} color={COLORS[i % COLORS.length]} />
                  </div>
                ))
              })()}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><SH icon={Icon.shield} title="Provider Status Overview" /></div>
            <div className="card-body">
              {[
                { label: 'Active Providers', count: db.providers.filter(p=>p.status==='Active').length, color: 'var(--success)' },
                { label: 'Onboarding', count: db.providers.filter(p=>p.status==='Pending'||p.status==='Onboarding').length, color: 'var(--warning)' },
                { label: 'Inactive', count: db.providers.filter(p=>p.status==='Inactive').length, color: 'var(--text-4)' },
                { label: 'With CAQH', count: db.providers.filter(p=>p.caqh).length, color: 'var(--pr)' },
                { label: 'With NPI', count: db.providers.filter(p=>p.npi).length, color: 'var(--pr)' },
                { label: 'With DEA', count: db.providers.filter(p=>p.dea).length, color: 'var(--purple)' },
              ].map((s, i) => (
                <div key={s.label} className="stat-row">
                  <span className="stat-row-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                    {s.label}
                  </span>
                  <span className="stat-row-value">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Payers' && (
        <div>
          <div className="card">
            <div className="card-header"><SH icon={Icon.payers} title="Active Panels by Payer" /></div>
            <div className="card-body">
              {Object.keys(panels).length === 0 ? (
                <div className="empty-state"><div className="empty-state-title">No active panels yet</div></div>
              ) : Object.entries(panels).sort((a, b) => b[1] - a[1]).map(([name, count], i) => (
                <div key={name} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                    <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{name}</span>
                    <span style={{ fontWeight: 600 }}>{count} provider{count > 1 ? 's' : ''}</span>
                  </div>
                  <ProgressBar pct={Math.round(count/maxPanels*100)} color={COLORS[i % COLORS.length]} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Turnaround Time' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><SH icon={Icon.clock} title="Avg Turnaround by Payer" /></div>
            <div className="card-body">
              {[
                { name: 'Aetna', days: 62, target: 90 },
                { name: 'BCBS', days: 54, target: 60 },
                { name: 'Cigna', days: 78, target: 90 },
                { name: 'Humana', days: 45, target: 60 },
                { name: 'Medicare', days: 38, target: 60 },
              ].map(p => (
                <div key={p.name} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                    <span>{p.name}</span>
                    <span style={{ fontWeight: 600, color: p.days > p.target ? 'var(--danger)' : 'var(--success)' }}>{p.days}d avg</span>
                  </div>
                  <ProgressBar pct={Math.min(Math.round(p.days/p.target*100), 100)} color={p.days > p.target ? 'var(--danger)' : 'var(--success)'} />
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><SH icon={Icon.trend} title="Processing Speed Metrics" /></div>
            <div className="card-body">
              {[
                { label: 'Avg Days to Submit', val: '8d', sub: 'from provider onboarding' },
                { label: 'Avg Days to Approval', val: '28d', sub: 'industry avg: 45–90d' },
                { label: 'Fastest Approval', val: '12d', sub: 'Medicare, Q1 2024' },
                { label: 'Re-attestation Compliance', val: '94%', sub: 'CAQH attestations on time' },
                { label: 'Follow-up Rate', val: '87%', sub: 'enrollments with documented follow-up' },
              ].map((m, i) => (
                <div key={i} className="stat-row">
                  <span className="stat-row-label">{m.label} <span style={{ fontSize: 10.5, color: 'var(--text-4)' }}>· {m.sub}</span></span>
                  <span className="stat-row-value" style={{ color: 'var(--pr)' }}>{m.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export Cards */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-header"><SH icon={Icon.download} title="Export Reports" /></div>
        <div className="card-body">
          <div className="grid-3" style={{ gap: 10 }}>
            {EXPORT_CARDS.map(({ icon, title, desc }) => (
              <div key={title} className="report-card" onClick={exportJSON}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <span style={{ color: 'var(--pr)' }}>{icon}</span>
                  <h4>{title}</h4>
                </div>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
