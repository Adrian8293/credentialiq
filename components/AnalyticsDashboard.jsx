import { useState, useMemo } from 'react'
import { daysUntil, fmtDate, pName, payName } from '../lib/helpers.js'
import { STAGES } from '../constants/stages.js'

// Color palette for charts
const CHART_COLORS = ['#2563EB', '#7C3AED', '#0D9488', '#D97706', '#EF4444', '#06B6D4', '#10B981', '#EC4899']

// Icon primitives
const Icon = {
  trend: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  clock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  alert: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
}

export function AnalyticsDashboard({ db }) {
  const [timeRange, setTimeRange] = useState('30') // days

  // Compute metrics
  const metrics = useMemo(() => {
    const now = new Date()
    const rangeStart = new Date(now.getTime() - parseInt(timeRange) * 24 * 60 * 60 * 1000)

    // Provider metrics
    const activeProviders = db.providers.filter(p => p.status === 'Active').length
    const totalProviders = db.providers.length

    // Enrollment metrics
    const activeEnrollments = db.enrollments.filter(e => e.stage === 'Active').length
    const pendingEnrollments = db.enrollments.filter(e => !['Active', 'Denied'].includes(e.stage)).length
    const deniedEnrollments = db.enrollments.filter(e => e.stage === 'Denied').length

    // Calculate approval rate
    const completedEnrollments = activeEnrollments + deniedEnrollments
    const approvalRate = completedEnrollments > 0 ? Math.round((activeEnrollments / completedEnrollments) * 100) : 0

    // Average time to approval (mock calculation based on stage)
    const avgDaysToApproval = 67 // Placeholder - would calculate from actual data

    // Credential health
    const expiringIn30 = db.providers.filter(p => {
      const fields = ['licenseExp', 'malExp', 'caqhDue', 'deaExp']
      return fields.some(f => {
        const days = daysUntil(p[f])
        return days !== null && days <= 30 && days >= 0
      })
    }).length

    const expiredCredentials = db.providers.filter(p => {
      const fields = ['licenseExp', 'malExp', 'caqhDue', 'deaExp']
      return fields.some(f => {
        const days = daysUntil(p[f])
        return days !== null && days < 0
      })
    }).length

    // Pipeline breakdown
    const pipelineStages = {}
    db.enrollments.forEach(e => {
      pipelineStages[e.stage] = (pipelineStages[e.stage] || 0) + 1
    })

    // Payer distribution
    const payerDistribution = {}
    db.enrollments.forEach(e => {
      const payer = db.payers.find(p => p.id === e.payId)
      const name = payer?.name || 'Unknown'
      payerDistribution[name] = (payerDistribution[name] || 0) + 1
    })

    // Specialty distribution
    const specDistribution = {}
    db.providers.filter(p => p.status === 'Active').forEach(p => {
      const spec = p.spec || 'Other'
      specDistribution[spec] = (specDistribution[spec] || 0) + 1
    })

    // Follow-ups needing attention
    const overdueFollowups = db.enrollments.filter(e => {
      const days = daysUntil(e.followup)
      return days !== null && days < 0
    }).length

    const upcomingFollowups = db.enrollments.filter(e => {
      const days = daysUntil(e.followup)
      return days !== null && days >= 0 && days <= 7
    }).length

    return {
      providers: { active: activeProviders, total: totalProviders },
      enrollments: { active: activeEnrollments, pending: pendingEnrollments, denied: deniedEnrollments },
      approvalRate,
      avgDaysToApproval,
      credentialHealth: { expiring30: expiringIn30, expired: expiredCredentials },
      pipelineStages,
      payerDistribution,
      specDistribution,
      followups: { overdue: overdueFollowups, upcoming: upcomingFollowups },
    }
  }, [db, timeRange])

  // Credential health score (0-100)
  const healthScore = useMemo(() => {
    const total = db.providers.length
    if (total === 0) return 100
    
    let issues = 0
    db.providers.forEach(p => {
      ['licenseExp', 'malExp', 'caqhDue', 'deaExp'].forEach(f => {
        const days = daysUntil(p[f])
        if (days !== null && days < 0) issues += 2 // Expired = 2 points
        else if (days !== null && days <= 30) issues += 1 // Expiring = 1 point
      })
    })
    
    const maxIssues = total * 8 // 4 fields * 2 points max
    return Math.max(0, Math.round(100 - (issues / maxIssues) * 100))
  }, [db.providers])

  const healthColor = healthScore >= 80 ? 'var(--success)' : healthScore >= 60 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="analytics-dashboard">
      {/* Time range selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>
          Analytics Overview
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['7', '30', '90'].map(days => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--r)',
                border: `1px solid ${timeRange === days ? 'var(--pr)' : 'var(--border)'}`,
                background: timeRange === days ? 'var(--pr-l)' : 'transparent',
                color: timeRange === days ? 'var(--pr)' : 'var(--text-2)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Health Score + Key Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, marginBottom: 16 }}>
        {/* Credential Health Score */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 160 }}>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke={healthColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${healthScore * 2.51} 251`}
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dasharray .6s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: healthColor }}>{healthScore}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>HEALTH</div>
            </div>
          </div>
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>Credential Health</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
              {metrics.credentialHealth.expired > 0 && `${metrics.credentialHealth.expired} expired · `}
              {metrics.credentialHealth.expiring30} expiring soon
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <MetricCard
            icon={Icon.check}
            label="Approval Rate"
            value={`${metrics.approvalRate}%`}
            sub={`${metrics.enrollments.active} of ${metrics.enrollments.active + metrics.enrollments.denied} completed`}
            color="var(--success)"
          />
          <MetricCard
            icon={Icon.clock}
            label="Avg. Turnaround"
            value={`${metrics.avgDaysToApproval}d`}
            sub="Time to approval"
            color="var(--pr)"
          />
          <MetricCard
            icon={Icon.trend}
            label="In Pipeline"
            value={metrics.enrollments.pending}
            sub="Pending enrollments"
            color="var(--warning)"
          />
          <MetricCard
            icon={Icon.alert}
            label="Needs Attention"
            value={metrics.followups.overdue + metrics.credentialHealth.expired}
            sub={`${metrics.followups.overdue} overdue, ${metrics.credentialHealth.expired} expired`}
            color="var(--danger)"
            alert={metrics.followups.overdue + metrics.credentialHealth.expired > 0}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Pipeline Funnel */}
        <div className="card">
          <div className="card-header">
            <h3>Enrollment Pipeline</h3>
            <span className="badge b-blue">{db.enrollments.length} total</span>
          </div>
          <div className="card-body">
            <PipelineFunnel stages={metrics.pipelineStages} total={db.enrollments.length} />
          </div>
        </div>

        {/* Payer Distribution */}
        <div className="card">
          <div className="card-header">
            <h3>Enrollments by Payer</h3>
          </div>
          <div className="card-body">
            <DistributionBars data={metrics.payerDistribution} total={db.enrollments.length} />
          </div>
        </div>
      </div>

      {/* Provider Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Specialty Distribution */}
        <div className="card">
          <div className="card-header">
            <h3>Provider Specialties</h3>
          </div>
          <div className="card-body">
            <SpecialtyPie data={metrics.specDistribution} />
          </div>
        </div>

        {/* Credential Status */}
        <div className="card">
          <div className="card-header">
            <h3>Credential Status</h3>
          </div>
          <div className="card-body">
            <CredentialStatusList providers={db.providers} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3>AI Insights</h3>
            <span className="badge b-purple" style={{ fontSize: 9 }}>AI-Powered</span>
          </div>
          <div className="card-body" style={{ padding: '12px 16px' }}>
            <AiInsights metrics={metrics} db={db} />
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, sub, color, alert }) {
  return (
    <div className="card" style={{ padding: '14px 16px', borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: alert ? color : 'var(--text-1)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}

function PipelineFunnel({ stages, total }) {
  const orderedStages = STAGES.filter(s => stages[s])
  
  if (orderedStages.length === 0) {
    return <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)' }}>No enrollments yet</div>
  }

  return (
    <div>
      {orderedStages.map((stage, idx) => {
        const count = stages[stage] || 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        const width = Math.max(20, pct)
        const color = CHART_COLORS[idx % CHART_COLORS.length]
        
        return (
          <div key={stage} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: 'var(--text-2)', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {stage}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{count} ({pct}%)</span>
            </div>
            <div style={{ height: 8, background: 'var(--elevated)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${width}%`,
                background: color,
                borderRadius: 4,
                transition: 'width .4s ease',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DistributionBars({ data, total }) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 6)
  
  if (sorted.length === 0) {
    return <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)' }}>No data</div>
  }

  const max = sorted[0]?.[1] || 1

  return (
    <div>
      {sorted.map(([name, count], idx) => {
        const pct = Math.round((count / max) * 100)
        const color = CHART_COLORS[idx % CHART_COLORS.length]
        
        return (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 8,
              height: 24,
              borderRadius: 2,
              background: color,
              flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </div>
              <div style={{ height: 4, background: 'var(--elevated)', borderRadius: 2, marginTop: 3 }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: color,
                  borderRadius: 2,
                }} />
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', minWidth: 24, textAlign: 'right' }}>
              {count}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SpecialtyPie({ data }) {
  const entries = Object.entries(data)
  const total = entries.reduce((sum, [, n]) => sum + n, 0)
  
  if (entries.length === 0) {
    return <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)' }}>No providers</div>
  }

  let offset = 0
  const r = 40
  const circ = 2 * Math.PI * r

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        {entries.map(([spec, count], idx) => {
          const pct = (count / total) * circ
          const slice = (
            <circle
              key={spec}
              cx="50" cy="50" r={r}
              fill="none"
              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
              strokeWidth="16"
              strokeDasharray={`${pct} ${circ - pct}`}
              strokeDashoffset={-offset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
            />
          )
          offset += pct
          return slice
        })}
        <text x="50" y="54" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--text-1)">
          {total}
        </text>
      </svg>
      <div style={{ flex: 1 }}>
        {entries.slice(0, 4).map(([spec, count], idx) => (
          <div key={spec} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[idx % CHART_COLORS.length] }} />
            <span style={{ fontSize: 11, color: 'var(--text-2)', flex: 1 }}>{spec}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)' }}>{count}</span>
          </div>
        ))}
        {entries.length > 4 && (
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
            +{entries.length - 4} more
          </div>
        )}
      </div>
    </div>
  )
}

function CredentialStatusList({ providers }) {
  const activeProviders = providers.filter(p => p.status === 'Active')
  
  const credentialCounts = {
    license: { current: 0, expiring: 0, expired: 0 },
    malpractice: { current: 0, expiring: 0, expired: 0 },
    caqh: { current: 0, expiring: 0, expired: 0 },
    dea: { current: 0, expiring: 0, expired: 0, na: 0 },
  }

  activeProviders.forEach(p => {
    // License
    const licDays = daysUntil(p.licenseExp)
    if (licDays === null || licDays > 90) credentialCounts.license.current++
    else if (licDays < 0) credentialCounts.license.expired++
    else credentialCounts.license.expiring++

    // Malpractice
    const malDays = daysUntil(p.malExp)
    if (malDays === null || malDays > 90) credentialCounts.malpractice.current++
    else if (malDays < 0) credentialCounts.malpractice.expired++
    else credentialCounts.malpractice.expiring++

    // CAQH
    const caqhDays = daysUntil(p.caqhDue)
    if (caqhDays === null || caqhDays > 90) credentialCounts.caqh.current++
    else if (caqhDays < 0) credentialCounts.caqh.expired++
    else credentialCounts.caqh.expiring++

    // DEA
    if (!p.deaExp) credentialCounts.dea.na++
    else {
      const deaDays = daysUntil(p.deaExp)
      if (deaDays === null || deaDays > 90) credentialCounts.dea.current++
      else if (deaDays < 0) credentialCounts.dea.expired++
      else credentialCounts.dea.expiring++
    }
  })

  const rows = [
    { label: 'License', ...credentialCounts.license },
    { label: 'Malpractice', ...credentialCounts.malpractice },
    { label: 'CAQH', ...credentialCounts.caqh },
    { label: 'DEA', ...credentialCounts.dea },
  ]

  return (
    <div>
      {rows.map(row => (
        <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-l)' }}>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--text-2)' }}>{row.label}</span>
          <StatusBadge count={row.current} type="current" />
          <StatusBadge count={row.expiring} type="expiring" />
          <StatusBadge count={row.expired} type="expired" />
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ count, type }) {
  if (count === 0) return null
  
  const styles = {
    current: { bg: 'rgba(16,185,129,.1)', color: 'var(--success)' },
    expiring: { bg: 'rgba(245,158,11,.1)', color: 'var(--warning)' },
    expired: { bg: 'rgba(239,68,68,.1)', color: 'var(--danger)' },
  }
  
  const s = styles[type]
  
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 'var(--r-pill)',
      fontSize: 10,
      fontWeight: 600,
      background: s.bg,
      color: s.color,
    }}>
      {count}
    </span>
  )
}

function AiInsights({ metrics, db }) {
  const insights = []

  // Generate AI-style insights based on data
  if (metrics.credentialHealth.expired > 0) {
    insights.push({
      type: 'urgent',
      text: `${metrics.credentialHealth.expired} provider${metrics.credentialHealth.expired > 1 ? 's have' : ' has'} expired credentials requiring immediate renewal.`,
    })
  }

  if (metrics.followups.overdue > 0) {
    insights.push({
      type: 'warning',
      text: `${metrics.followups.overdue} enrollment follow-up${metrics.followups.overdue > 1 ? 's are' : ' is'} overdue. Consider sending status inquiries.`,
    })
  }

  if (metrics.credentialHealth.expiring30 > 0) {
    insights.push({
      type: 'info',
      text: `${metrics.credentialHealth.expiring30} credential${metrics.credentialHealth.expiring30 > 1 ? 's' : ''} expiring in 30 days. Start renewal process now.`,
    })
  }

  if (metrics.approvalRate >= 90 && metrics.enrollments.active >= 5) {
    insights.push({
      type: 'success',
      text: `Excellent ${metrics.approvalRate}% approval rate! Your credentialing process is highly effective.`,
    })
  }

  if (metrics.enrollments.pending > 10) {
    insights.push({
      type: 'info',
      text: `${metrics.enrollments.pending} pending enrollments. Consider prioritizing oldest applications.`,
    })
  }

  if (insights.length === 0) {
    insights.push({
      type: 'success',
      text: 'All systems healthy. No urgent actions needed at this time.',
    })
  }

  const typeStyles = {
    urgent: { icon: '🚨', bg: 'rgba(239,68,68,.08)', border: 'rgba(239,68,68,.2)' },
    warning: { icon: '⚠️', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)' },
    info: { icon: '💡', bg: 'var(--pr-l)', border: 'rgba(59,130,246,.2)' },
    success: { icon: '✓', bg: 'rgba(16,185,129,.08)', border: 'rgba(16,185,129,.2)' },
  }

  return (
    <div>
      {insights.slice(0, 3).map((insight, idx) => {
        const style = typeStyles[insight.type]
        return (
          <div
            key={idx}
            style={{
              padding: '10px 12px',
              background: style.bg,
              border: `1px solid ${style.border}`,
              borderRadius: 'var(--r)',
              marginBottom: idx < insights.length - 1 ? 8 : 0,
              fontSize: 12,
              lineHeight: 1.5,
              color: 'var(--text-1)',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}
          >
            <span style={{ flexShrink: 0 }}>{style.icon}</span>
            <span>{insight.text}</span>
          </div>
        )
      })}
    </div>
  )
}

export default AnalyticsDashboard
