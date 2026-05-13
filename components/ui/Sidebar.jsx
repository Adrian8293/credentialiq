/**
 * Sidebar.jsx — Lacentra
 * Navigation: Billing is a top-level page (not expandable).
 * Marketing is a top-level page (not expandable — PT shown as card on the page).
 * Claims/Eligibility/Denial/Revenue are all inside the Billing tab.
 */

import { useState } from 'react'

function LacentraMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Shield shape split: left half blue, right half green */}
      <path d="M24 4L6 12V26C6 35 14 42 24 46C34 42 42 35 42 26V12L24 4Z" fill="#1565C0"/>
      <path d="M24 4L42 12V26C42 35 34 42 24 46V4Z" fill="#5CB85C"/>
      {/* Checkmark */}
      <polyline points="14,25 21,32 34,18" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

const I = {
  dashboard:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  providers:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  applications:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  payers:      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  documents:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  tasks:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  alerts:      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  billing:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  marketing:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  reports:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  audit:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  settings:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M20.49 12H22M2 12h1.51M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 20.49V22M12 2v1.51"/></svg>,
  collapse:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  expand:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  support:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
}

const BILLING_PAGES = ['billing']

export function Sidebar({ page, setPage, alertCount, expDocs, user, signOut, db }) {
  const [collapsed, setCollapsed] = useState(false)

  const taskCount = db?.tasks?.filter(t => t.status !== 'Done').length || 0
  const overdueTaskCount = db?.tasks?.filter(t => {
    if (t.status === 'Done') return false
    if (!t.due) return false
    return new Date(t.due + 'T00:00:00') < new Date(new Date().toDateString())
  }).length || 0
  const meta = user?.user_metadata || {}
  const displayName = (meta.first_name && meta.last_name)
    ? `${meta.first_name} ${meta.last_name}`
    : meta.first_name || meta.full_name || 'Admin'
  const initial = (displayName[0] || 'A').toUpperCase()

  function navItem(pg, label, icon, badge, badgeCls) {
    const active = page === pg
    const isDanger = badgeCls === 'danger'
    return (
      <div key={pg} className={`sb-item${active ? ' active' : ''}`}
        onClick={() => setPage(pg)}
        title={collapsed ? label : undefined}>
        <span className="sb-item-icon">{icon}</span>
        {!collapsed && <span className="sb-item-label">{label}</span>}
        {!collapsed && badge > 0 && (
          <span className={`sb-badge${isDanger ? '' : badgeCls ? ' ' + badgeCls : ''}`}
            style={isDanger ? { background: 'var(--danger)', color: '#fff', animation: 'pulse 2s infinite' } : undefined}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {collapsed && badge > 0 && <span className="sb-badge-dot" style={isDanger ? { background: 'var(--danger)' } : undefined} />}
      </div>
    )
  }

  return (
    <nav className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Logo */}
      <div className="sb-logo">
        <div className="sb-logo-mark">
          <LacentraMark size={collapsed ? 26 : 28} />
          {!collapsed && (
            <div className="sb-logo-text">
              <h1><span className="brand-prime">LAC</span><span className="brand-credential">entra</span></h1>
              <div className="sb-logo-sub">Credentialing Platform</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="sb-nav">
        {navItem('dashboard',    'Dashboard',    I.dashboard)}
        {navItem('providers',    'Providers',    I.providers)}
        {navItem('applications', 'Applications', I.applications)}
        {navItem('payers',       'Payers',       I.payers)}
        {navItem('documents',    'Documents',    I.documents, expDocs, 'amber')}
        {navItem('tasks',        'Tasks',        I.tasks,     taskCount, overdueTaskCount > 0 ? 'danger' : undefined)}
        {navItem('alerts',       'Alerts',       I.alerts,    alertCount)}
        {navItem('billing',      'Billing',      I.billing)}
        {navItem('marketing',    'Marketing',    I.marketing)}
        {navItem('reports',      'Reports',      I.reports)}
        {navItem('audit',        'Audit Trail',  I.audit)}
        {navItem('settings',     'Settings',     I.settings)}
      </div>

      {/* Footer */}
      <div className="sb-footer">
        {!collapsed && (
          <div className="sb-support" onClick={() => window.open('mailto:support@lacentra.com')}>
            <div className="sb-support-title">{I.support} Need Help?</div>
            <div className="sb-support-sub">Contact Support</div>
          </div>
        )}
        {!collapsed && (
          <div className="sb-user">
            <div className="sb-avatar">{initial}</div>
            <div className="sb-user-info">
              <div className="sb-user-name">{displayName}</div>
              <div className="sb-user-email">{user?.email}</div>
            </div>
            <button className="sb-signout-icon" onClick={signOut} title="Sign out">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        )}
        <button className="sb-collapse-btn" onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? I.expand : I.collapse}
        </button>
      </div>
    </nav>
  )
}

export default Sidebar
