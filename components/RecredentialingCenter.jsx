import { useState, useMemo } from 'react'
import { daysUntil, fmtDate, pName } from '../lib/helpers.js'

// Credential types we track for recredentialing
const CREDENTIAL_TYPES = [
  { key: 'licenseExp', label: 'Professional License', icon: '📜', critical: true },
  { key: 'malExp', label: 'Malpractice Insurance', icon: '🛡️', critical: true },
  { key: 'caqhDue', label: 'CAQH Attestation', icon: '✓', critical: true },
  { key: 'deaExp', label: 'DEA Certificate', icon: '💊', critical: false },
  { key: 'recred', label: 'Recredentialing Due', icon: '🔄', critical: true },
]

// Timeline thresholds
const THRESHOLDS = {
  CRITICAL: 0,    // Expired
  URGENT: 30,     // Within 30 days
  WARNING: 60,    // Within 60 days
  UPCOMING: 90,   // Within 90 days
}

function getCredentialStatus(days) {
  if (days === null) return { status: 'none', color: 'var(--text-3)', label: 'Not Set' }
  if (days < 0) return { status: 'expired', color: 'var(--danger)', label: `Expired ${Math.abs(days)}d ago` }
  if (days <= THRESHOLDS.URGENT) return { status: 'urgent', color: 'var(--danger)', label: `${days}d left` }
  if (days <= THRESHOLDS.WARNING) return { status: 'warning', color: 'var(--warning)', label: `${days}d left` }
  if (days <= THRESHOLDS.UPCOMING) return { status: 'upcoming', color: '#2563eb', label: `${days}d left` }
  return { status: 'ok', color: 'var(--success)', label: 'Current' }
}

export function RecredentialingCenter({ db, onCreateTask, onViewProvider }) {
  const [filter, setFilter] = useState('all') // all, expired, urgent, warning
  const [sortBy, setSortBy] = useState('urgency') // urgency, name, type
  const [selectedType, setSelectedType] = useState('all')

  // Build credential items from all providers
  const credentialItems = useMemo(() => {
    const items = []
    
    db.providers.forEach(provider => {
      if (provider.status !== 'Active') return
      
      CREDENTIAL_TYPES.forEach(type => {
        const value = provider[type.key]
        if (!value && !type.critical) return // Skip non-critical if not set
        
        const days = daysUntil(value)
        const statusInfo = getCredentialStatus(days)
        
        items.push({
          id: `${provider.id}-${type.key}`,
          provider,
          type,
          value,
          days,
          ...statusInfo,
        })
      })
    })
    
    return items
  }, [db.providers])

  // Filter items
  const filteredItems = useMemo(() => {
    let result = [...credentialItems]
    
    // Filter by status
    if (filter === 'expired') {
      result = result.filter(i => i.status === 'expired')
    } else if (filter === 'urgent') {
      result = result.filter(i => i.status === 'urgent' || i.status === 'expired')
    } else if (filter === 'warning') {
      result = result.filter(i => ['expired', 'urgent', 'warning'].includes(i.status))
    }
    
    // Filter by type
    if (selectedType !== 'all') {
      result = result.filter(i => i.type.key === selectedType)
    }
    
    // Sort
    if (sortBy === 'urgency') {
      result.sort((a, b) => {
        if (a.days === null && b.days === null) return 0
        if (a.days === null) return 1
        if (b.days === null) return -1
        return a.days - b.days
      })
    } else if (sortBy === 'name') {
      result.sort((a, b) => `${a.provider.lname}${a.provider.fname}`.localeCompare(`${b.provider.lname}${b.provider.fname}`))
    } else if (sortBy === 'type') {
      result.sort((a, b) => a.type.label.localeCompare(b.type.label))
    }
    
    return result
  }, [credentialItems, filter, selectedType, sortBy])

  // Stats
  const stats = useMemo(() => {
    const expired = credentialItems.filter(i => i.status === 'expired').length
    const urgent = credentialItems.filter(i => i.status === 'urgent').length
    const warning = credentialItems.filter(i => i.status === 'warning').length
    const upcoming = credentialItems.filter(i => i.status === 'upcoming').length
    
    return { expired, urgent, warning, upcoming, total: credentialItems.length }
  }, [credentialItems])

  // Group by provider for the timeline view
  const providerTimeline = useMemo(() => {
    const grouped = {}
    filteredItems.forEach(item => {
      if (!grouped[item.provider.id]) {
        grouped[item.provider.id] = {
          provider: item.provider,
          items: [],
          nextExpiry: null,
        }
      }
      grouped[item.provider.id].items.push(item)
      
      // Track next expiring credential
      if (item.days !== null && (grouped[item.provider.id].nextExpiry === null || item.days < grouped[item.provider.id].nextExpiry)) {
        grouped[item.provider.id].nextExpiry = item.days
      }
    })
    
    return Object.values(grouped).sort((a, b) => {
      if (a.nextExpiry === null) return 1
      if (b.nextExpiry === null) return -1
      return a.nextExpiry - b.nextExpiry
    })
  }, [filteredItems])

  return (
    <div className="recredentialing-center">
      {/* Stats row */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <button 
          className={`kpi ${filter === 'expired' ? 'kpi-active' : ''}`}
          onClick={() => setFilter(filter === 'expired' ? 'all' : 'expired')}
          style={{ cursor: 'pointer', textAlign: 'left' }}
        >
          <div className="kpi-label" style={{ color: 'var(--danger)' }}>Expired</div>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>{stats.expired}</div>
          <div className="kpi-sub">Requires immediate action</div>
        </button>
        <button 
          className={`kpi ${filter === 'urgent' ? 'kpi-active' : ''}`}
          onClick={() => setFilter(filter === 'urgent' ? 'all' : 'urgent')}
          style={{ cursor: 'pointer', textAlign: 'left' }}
        >
          <div className="kpi-label" style={{ color: 'var(--danger)' }}>Due in 30 Days</div>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>{stats.urgent}</div>
          <div className="kpi-sub">Start renewal now</div>
        </button>
        <button 
          className={`kpi ${filter === 'warning' ? 'kpi-active' : ''}`}
          onClick={() => setFilter(filter === 'warning' ? 'all' : 'warning')}
          style={{ cursor: 'pointer', textAlign: 'left' }}
        >
          <div className="kpi-label" style={{ color: 'var(--warning)' }}>Due in 60 Days</div>
          <div className="kpi-value" style={{ color: 'var(--warning)' }}>{stats.warning}</div>
          <div className="kpi-sub">Plan renewal soon</div>
        </button>
        <button 
          className={`kpi ${filter === 'all' && selectedType === 'all' ? 'kpi-active' : ''}`}
          onClick={() => { setFilter('all'); setSelectedType('all') }}
          style={{ cursor: 'pointer', textAlign: 'left' }}
        >
          <div className="kpi-label">Upcoming (90 Days)</div>
          <div className="kpi-value">{stats.upcoming}</div>
          <div className="kpi-sub">On the horizon</div>
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-16">
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>Credential Type:</label>
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
                style={{ fontSize: 12 }}
              >
                <option value="all">All Types</option>
                {CREDENTIAL_TYPES.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>Sort by:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                style={{ fontSize: 12 }}
              >
                <option value="urgency">Urgency</option>
                <option value="name">Provider Name</option>
                <option value="type">Credential Type</option>
              </select>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>
              Showing {filteredItems.length} of {stats.total} credentials
            </div>
          </div>
        </div>
      </div>

      {/* Provider timeline view */}
      <div className="card">
        <div className="card-header">
          <h3>Recredentialing Timeline</h3>
          <span className="badge b-blue">{providerTimeline.length} providers</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {providerTimeline.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="ei">✅</div>
              <h4>All Clear</h4>
              <p>No credentials match the current filter.</p>
            </div>
          ) : (
            providerTimeline.map((group, idx) => (
              <ProviderCredentialRow
                key={group.provider.id}
                group={group}
                isLast={idx === providerTimeline.length - 1}
                onCreateTask={onCreateTask}
                onViewProvider={onViewProvider}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function ProviderCredentialRow({ group, isLast, onCreateTask, onViewProvider }) {
  const [expanded, setExpanded] = useState(false)
  const { provider, items, nextExpiry } = group

  // Determine overall urgency
  const hasExpired = items.some(i => i.status === 'expired')
  const hasUrgent = items.some(i => i.status === 'urgent')
  const urgencyColor = hasExpired ? 'var(--danger)' : hasUrgent ? 'var(--warning)' : 'var(--success)'

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-l)' }}>
      {/* Provider row */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          cursor: 'pointer',
          background: hasExpired ? 'rgba(239,68,68,.03)' : 'transparent',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status indicator */}
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: urgencyColor,
          boxShadow: `0 0 0 3px ${urgencyColor}22`,
          flexShrink: 0,
        }} />

        {/* Avatar */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--pr-l)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--pr)',
          flexShrink: 0,
        }}>
          {provider.fname?.[0]}{provider.lname?.[0]}
        </div>

        {/* Name and spec */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
            {provider.fname} {provider.lname}{provider.cred ? `, ${provider.cred}` : ''}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {provider.spec || 'Provider'}
          </div>
        </div>

        {/* Credential chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {items.slice(0, 3).map(item => (
            <span
              key={item.id}
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--r)',
                fontSize: 10,
                fontWeight: 600,
                background: `${item.color}15`,
                color: item.color,
                whiteSpace: 'nowrap',
              }}
            >
              {item.type.label.split(' ')[0]}: {item.label}
            </span>
          ))}
          {items.length > 3 && (
            <span style={{ fontSize: 10, color: 'var(--text-3)', alignSelf: 'center' }}>
              +{items.length - 3} more
            </span>
          )}
        </div>

        {/* Expand icon */}
        <div style={{
          color: 'var(--text-3)',
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform .2s',
        }}>
          ▼
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: '0 16px 16px 54px' }}>
          {items.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 0',
                borderBottom: '1px solid var(--border-l)',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.type.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)' }}>
                  {item.type.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {item.value ? `Expires: ${fmtDate(item.value)}` : 'Not set'}
                </div>
              </div>
              <span style={{
                padding: '3px 10px',
                borderRadius: 'var(--r-pill)',
                fontSize: 11,
                fontWeight: 600,
                background: `${item.color}15`,
                color: item.color,
              }}>
                {item.label}
              </span>
              {item.status !== 'ok' && item.status !== 'none' && onCreateTask && (
                <button
                  className="btn btn-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateTask({
                      task: `Renew ${item.type.label} for ${provider.fname} ${provider.lname}`,
                      provId: provider.id,
                      priority: item.status === 'expired' ? 'Urgent' : 'High',
                      due: item.value,
                    })
                  }}
                >
                  Create Task
                </button>
              )}
            </div>
          ))}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onViewProvider?.(provider.id)}
            >
              View Provider
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                // Generate all renewal tasks
                items
                  .filter(i => i.status !== 'ok' && i.status !== 'none')
                  .forEach(item => {
                    onCreateTask?.({
                      task: `Renew ${item.type.label}`,
                      provId: provider.id,
                      priority: item.status === 'expired' ? 'Urgent' : 'High',
                      due: item.value,
                    })
                  })
              }}
            >
              Create All Tasks
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecredentialingCenter
