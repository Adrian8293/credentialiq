import { useState } from 'react'

/* ── PrimeCredential Shield Mark ──────────────────────────────────────────── */
function PcMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2L25 8V20L14 26L3 20V8L14 2Z"
        fill="#2563EB" fillOpacity="0.18"
        stroke="#3B82F6" strokeWidth="1.5"/>
      <text x="14" y="18" textAnchor="middle"
        fontFamily="Plus Jakarta Sans,sans-serif"
        fontWeight="800" fontSize="11" fill="#fff">P</text>
      <path d="M10 17.5l2.5 2.5 5-5"
        stroke="#60A5FA" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ── Icon library — every page key mapped ─────────────────────────────────── */
const ICONS = {
  dashboard: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/>
      <rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/>
    </svg>
  ),
  alerts: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1.5a4 4 0 014 4v3l1 1.5H2L3 8.5v-3a4 4 0 014-4z"/><path d="M5.5 10.5a1.5 1.5 0 003 0"/>
    </svg>
  ),
  providers: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="4" r="2.5"/><path d="M1.5 12c0-2.5 2.5-4 5.5-4s5.5 1.5 5.5 4"/>
    </svg>
  ),
  'add-provider': (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="4" r="2.5"/><path d="M1 12c0-2.5 2 -4 5-4"/><line x1="10" y1="8" x2="10" y2="13"/><line x1="7.5" y1="10.5" x2="12.5" y2="10.5"/>
    </svg>
  ),
  'provider-lookup': (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="4"/><path d="M10.5 10.5l2.5 2.5"/>
    </svg>
  ),
  'license-verification': (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="1" width="10" height="12" rx="1.5"/><path d="M4 7l2 2 4-4"/>
    </svg>
  ),
  'payer-hub': (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="12" height="8" rx="1.5"/><path d="M1 6h12"/>
    </svg>
  ),
  enrollments: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1H3a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6L8 1z"/><path d="M8 1v5h4"/>
    </svg>
  ),
  pipeline: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="3" height="11" rx="1"/><rect x="5.5" y="1.5" width="3" height="8" rx="1"/><rect x="9.5" y="1.5" width="3" height="9.5" rx="1"/>
    </svg>
  ),
  payers: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="12" height="8" rx="1.5"/><path d="M1 6h12"/>
    </svg>
  ),
  'payer-requirements': (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7l2 2 4-4"/><rect x="2" y="1" width="10" height="12" rx="1.5"/>
    </svg>
  ),
  'missing-docs': (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="5.5"/><path d="M7 4.5V7M7 9.5v.5"/>
    </svg>
  ),
  documents: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1H3a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6L8 1z"/><path d="M8 1v5h4"/><path d="M4.5 9h5M4.5 7h2"/>
    </svg>
  ),
  workflows: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 7l3 3 7-7"/>
    </svg>
  ),
  'psychology-today': (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1.5C7 1.5 2 4 2 8a5 5 0 0010 0c0-4-5-6.5-5-6.5z"/>
    </svg>
  ),
  eligibility: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1a6 6 0 100 12A6 6 0 007 1z"/><path d="M4 7l2 2 4-4"/>
    </svg>
  ),
  claims: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h10M2 7h10M2 10h6"/>
    </svg>
  ),
  denials: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="5.5"/><path d="M4.5 4.5l5 5M9.5 4.5l-5 5"/>
    </svg>
  ),
  revenue: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10V7M5 10V5M8 10V3M11 10V6"/><path d="M1 12h12"/>
    </svg>
  ),
  reports: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 8L4 4l3 3 2-2.5L12 9H1z"/><path d="M1 12h12"/>
    </svg>
  ),
  audit: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="4"/><path d="M10 10l3 3"/><path d="M4.5 6h3M6 4.5v3"/>
    </svg>
  ),
  settings: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="2.2"/><path d="M7 1.5v1M7 11.5v1M1.5 7h1M11.5 7h1M3.2 3.2l.7.7M10.1 10.1l.7.7M10.1 3.9l-.7.7M3.9 10.1l-.7.7"/>
    </svg>
  ),
}

/* ── Flat nav definition — ordered, no groups ─────────────────────────────── */
const NAV_ITEMS = [
  { page: 'dashboard',            label: 'Dashboard' },
  { page: 'providers',            label: 'Providers' },
  { page: 'add-provider',         label: 'Add Provider' },
  { page: 'provider-lookup',      label: 'NPI Lookup' },
  { page: 'license-verification', label: 'License Verify' },
  { page: 'payer-hub',            label: 'Payer Hub',     badgeKey: 'pending' },
  { page: 'missing-docs',         label: 'Missing Docs',  badgeKey: 'expDocs' },
  { page: 'documents',            label: 'Documents',     badgeKey: 'expDocs' },
  { page: 'workflows',            label: 'Tasks' },
  { page: 'psychology-today',     label: 'Psychology Today' },
  { page: 'eligibility',          label: 'Eligibility' },
  { page: 'claims',               label: 'Claims' },
  { page: 'denials',              label: 'Denials' },
  { page: 'revenue',              label: 'Revenue' },
  { page: 'alerts',               label: 'Alerts',        badgeKey: 'alerts', badgeCls: '' },
  { page: 'reports',              label: 'Reports' },
  { page: 'audit',                label: 'Audit Trail' },
  { page: 'settings',             label: 'Settings' },
]

export function Sidebar({ page, setPage, alertCount, pendingEnroll, expDocs, user, signOut }) {

  const badges = { alerts: alertCount, pending: pendingEnroll, expDocs }

  const meta        = user?.user_metadata || {}
  const displayName = (meta.first_name && meta.last_name)
    ? `${meta.first_name} ${meta.last_name}`
    : meta.first_name || meta.full_name || 'Admin'
  const displayEmail = user?.email || ''
  const initial      = displayName[0]?.toUpperCase() || 'A'

  return (
    <nav className="sidebar">

      {/* ── Logo ── */}
      <div className="sb-logo">
        <div className="sb-logo-mark">
          <div className="sb-logo-icon"><PcMark /></div>
          <div>
            <h1>
              <span className="brand-prime">Prime</span>
              <span className="brand-credential">Credential</span>
            </h1>
            <div className="sb-logo-sub">Credentialing Suite</div>
          </div>
        </div>
      </div>

      {/* ── Flat Nav ── */}
      <div className="sb-nav">
        <div className="sb-nav-groups">
          {NAV_ITEMS.map(({ page: pg, label, badgeKey, badgeCls }) => {
            const count = badgeKey ? badges[badgeKey] : 0
            return (
              <div
                key={pg}
                className={`sb-item ${page === pg ? 'active' : ''}`}
                onClick={() => setPage(pg)}
              >
                <span style={{ width: 13, height: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {ICONS[pg] || null}
                </span>
                <span style={{ marginLeft: 1 }}>{label}</span>
                {count > 0 && (
                  <span className={`sb-badge${badgeCls ? ' ' + badgeCls : ''}`}>
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── User footer ── */}
      <div className="sb-footer">
        <div className="sb-user">
          <div className="sb-avatar">{initial}</div>
          <div className="sb-user-info">
            <div className="sb-user-name">{displayName}</div>
            <div className="sb-user-email">{displayEmail}</div>
            <button className="sb-signout" onClick={signOut}>Sign out →</button>
          </div>
        </div>
      </div>

    </nav>
  )
}

export { Sidebar }
